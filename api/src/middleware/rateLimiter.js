const rateLimit = require('express-rate-limit');

/**
 * 15 minutes window duration in milliseconds.
 * @type {number}
 */
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/**
 * Helper factory to create configured rate limiters with standardized error responses.
 *
 * @param {number} maxRequests - Max requests allowed per window per IP
 * @param {string} customMessage - Explanatory message for rate limit exceedance
 * @returns {import('express').RequestHandler}
 */
const createLimiter = (maxRequests, customMessage) => {
  const errorResponse = {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: customMessage,
    },
  };

  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: maxRequests,
    keyGenerator: (req) => req.ip,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    message: errorResponse,
    handler: (req, res, _next, options) => {
      res.status(options.statusCode || 429).json(options.message || errorResponse);
    },
  });
};

/**
 * Global rate limiter: 200 requests per 15 minutes per IP.
 * Protects general application endpoints from excessive traffic.
 */
const globalLimiter = createLimiter(
  200,
  'Too many requests from this IP, please try again after 15 minutes.'
);

/**
 * Auth rate limiter: 20 requests per 15 minutes per IP.
 * Applied to login and registration routes to mitigate brute force attacks.
 */
const authLimiter = createLimiter(
  20,
  'Too many authentication attempts from this IP, please try again after 15 minutes.'
);

/**
 * API rate limiter: 100 requests per 15 minutes per IP.
 * Applied to standard API resource endpoints (e.g. /todos).
 */
const apiLimiter = createLimiter(
  100,
  'Too many API requests from this IP, please try again after 15 minutes.'
);

module.exports = {
  globalLimiter,
  authLimiter,
  apiLimiter,
};
