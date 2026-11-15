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

// In containers (where user is non-root node), write logs to /tmp/logs if /app/logs is not writable
let logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (e) {
  logsDir = path.join('/tmp', 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (err) {
    // If still fails, logsDir will just be disabled
  }
}

const transports = [
  new winston.transports.Console({
    format: isProduction
      ? combine(timestamp(), errors({ stack: true }), json())
      : combine(colorize({ all: true }), simple()),
  }),
];

try {
  if (fs.existsSync(logsDir)) {
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: combine(timestamp(), errors({ stack: true }), json()),
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: combine(timestamp(), errors({ stack: true }), json()),
      })
    );
  }
} catch (e) {
  // Console logging is always available
}

/**
 * Winston structured logger instance.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  levels,
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  transports,
});

/**
 * Stream object for HTTP logging integration with Morgan.
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
