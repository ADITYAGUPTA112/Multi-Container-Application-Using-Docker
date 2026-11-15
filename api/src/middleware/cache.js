const { getCache, setCache, deleteCachePattern } = require('../config/redis');

/**
 * Express caching middleware factory using Redis.
 *
 * For GET requests:
 * 1. Generates a cache key based on keyPrefix, originalUrl, and authenticated user ID (or 'anon').
 * 2. Checks Redis cache.
 * 3. On cache hit: returns cached JSON response immediately.
 * 4. On cache miss: monkey-patches res.json to intercept the response, saves it to Redis if status is 2xx,
 *    and sends the response to the client.
 *
 * @param {string} keyPrefix - Namespace prefix for cache keys (e.g. 'todos')
 * @param {number} [ttlSeconds=300] - Expiration time in seconds (default: 300)
 * @returns {import('express').RequestHandler} Express middleware function
 */
const cacheMiddleware = (keyPrefix, ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.user?.id || 'anon';
    const cacheKey = `${keyPrefix}:${req.originalUrl}:${userId}`;

    try {
      const cachedData = await getCache(cacheKey);
      if (cachedData !== null && cachedData !== undefined) {
        return res.status(200).json(cachedData);
      }
    } catch (err) {
      console.error(`[CacheMiddleware] Error reading cache for key "${cacheKey}":`, err.message);
    }

    // Monkey-patch res.json to intercept the outgoing response
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Restore original res.json to prevent subsequent interceptions
      res.json = originalJson;

      // Only cache 2xx successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(cacheKey, body, ttlSeconds).catch((err) => {
          console.error(`[CacheMiddleware] Error setting cache for key "${cacheKey}":`, err.message);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Cache invalidation middleware factory.
 * Runs after the main handler to clear related caches matching `${keyPrefix}:*`.
 *
 * @param {string} keyPrefix - Cache key prefix to invalidate
 * @returns {import('express').RequestHandler} Express middleware function
 */
const invalidateCache = (keyPrefix) => {
  return async (req, res, next) => {
    try {
      await deleteCachePattern(`${keyPrefix}:*`);
    } catch (err) {
      console.error(`[CacheMiddleware] Error invalidating cache pattern "${keyPrefix}:*":`, err.message);
    }

    if (typeof next === 'function') {
      next();
    }
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
};
