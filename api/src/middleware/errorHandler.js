/**
 * 404 Not Found Middleware for undefined endpoints.
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Central Global Error Handling Middleware.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] Unhandled error occurred: ${err.message}`, err.stack);

  // Mongoose CastError (e.g. invalid ObjectId that bypassed validator)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_RESOURCE_ID',
        message: `Invalid identifier provided for path '${err.path}'.`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: messages.join(', '),
        details: messages,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // JSON Syntax Error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'Malformed JSON payload provided in request body.',
        timestamp: new Date().toISOString(),
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isProd ? 'An unexpected server error occurred. Please try again later.' : err.message,
      ...(isProd ? {} : { stack: err.stack }),
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
