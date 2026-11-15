const fs = require('fs');
const path = require('path');
const winston = require('winston');

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

/**
 * Custom log levels matching requirements: error, warn, info, http, debug.
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Colors associated with each custom log level for console output.
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

winston.addColors(colors);

const isProduction = process.env.NODE_ENV === 'production';

// Ensure the logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Winston structured logger instance.
 * - Base format: combine(timestamp, errors({stack:true}), json())
 * - Console transport: colorized simple format in development; JSON in production
 * - File transports: error.log (level: 'error'), combined.log (all levels)
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  levels,
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? combine(timestamp(), errors({ stack: true }), json())
        : combine(colorize({ all: true }), simple()),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
  ],
});

/**
 * Stream object for HTTP logging integration with Morgan.
 * Passes incoming HTTP request logs directly to logger.http.
 */
const httpStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = {
  logger,
  httpStream,
};
