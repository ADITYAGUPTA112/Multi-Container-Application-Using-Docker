const Redis = require('ioredis');

/**
 * Redis connection URL from environment variables, defaulting to container service name.
 * @type {string}
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

/**
 * Resilient Redis client instance with graceful reconnection strategy
 * and offline queue protection to prevent unhandled rejections during outages.
 */
let redisClient = null;

if (process.env.NODE_ENV !== 'test') {
  redisClient = new Redis(REDIS_URL, {
    enableOfflineQueue: false,
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying after 5 attempts
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  });

  // Event listeners for Redis client connection lifecycle
  redisClient.on('connect', () => {
    console.log('[Redis] Connected to Redis server');
  });

  redisClient.on('ready', () => {
    console.log('[Redis] Client ready to receive commands');
  });

  redisClient.on('error', (err) => {
    console.error('[Redis] Client error:', err.message);
  });

  redisClient.on('close', () => {
    console.log('[Redis] Connection closed');
  });
}

/**
 * Checks if the Redis client is currently available and ready to accept commands.
 * Defaults to false if client is null or in test environment.
 *
 * @returns {boolean} True if ready or mocked, false if disconnected/connecting.
 */
const isClientReady = () => {
  if (!redisClient) return false;
  return redisClient.status === undefined || redisClient.status === 'ready';
};

/**
 * Retrieve and parse JSON value from Redis cache by key.
 * If Redis is offline or an error occurs, returns null gracefully without throwing.
 *
 * @param {string} key - Cache key to retrieve
 * @returns {Promise<any|null>} Parsed JSON object, or null if key missing / Redis down
 */
const getCache = async (key) => {
  try {
    if (!isClientReady()) {
      return null;
    }
    const data = await redisClient.get(key);
    if (data === null || data === undefined) {
      return null;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error(`[Redis] getCache error for key "${key}":`, err.message);
    return null;
  }
};

/**
 * Serialize to JSON and store a value in Redis cache with TTL.
 * If Redis is offline or an error occurs, fails silently without crashing.
 *
 * @param {string} key - Cache key to store
 * @param {any} value - Value to serialize to JSON and cache
 * @param {number} [ttlSeconds=300] - Expiration time in seconds (default: 300)
 * @returns {Promise<void>}
 */
const setCache = async (key, value, ttlSeconds = 300) => {
  try {
    if (!isClientReady()) {
      return;
    }
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await redisClient.set(key, serialized);
    }
  } catch (err) {
    console.error(`[Redis] setCache error for key "${key}":`, err.message);
  }
};

/**
 * Delete a specific key from Redis cache.
 * If Redis is offline or an error occurs, fails silently without crashing.
 *
 * @param {string} key - Cache key to delete
 * @returns {Promise<void>}
 */
const deleteCache = async (key) => {
  try {
    if (!isClientReady()) {
      return;
    }
    await redisClient.del(key);
  } catch (err) {
    console.error(`[Redis] deleteCache error for key "${key}":`, err.message);
  }
};

/**
 * Delete all cache keys matching a pattern.
 * If Redis is offline or an error occurs, fails silently without crashing.
 *
 * @param {string} pattern - Key pattern (e.g. 'todos:*')
 * @returns {Promise<void>}
 */
const deleteCachePattern = async (pattern) => {
  try {
    if (!isClientReady()) {
      return;
    }
    const keys = await redisClient.keys(pattern);
    if (Array.isArray(keys) && keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    console.error(`[Redis] deleteCachePattern error for pattern "${pattern}":`, err.message);
  }
};

/**
 * Gracefully close Redis connection on process termination.
 */
const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[Redis] Connection closed cleanly.');
    } catch (err) {
      console.warn(`[Redis] Error closing connection: ${err.message}`);
      try {
        redisClient.disconnect();
      } catch (e) {
        // Ignore
      }
    }
  }
};

module.exports = {
  redisClient,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  closeRedisConnection,
};
