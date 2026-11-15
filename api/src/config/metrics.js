const client = require('prom-client');

/**
 * Custom Prometheus metrics registry instance.
 */
const register = new client.Registry();

// Configure default global labels
register.setDefaultLabels({
  app: 'todo-api',
});

// Enable default metrics collection (CPU, memory, event loop, garbage collection)
client.collectDefaultMetrics({ register });

/**
 * Histogram metric for tracking HTTP request duration in seconds.
 * Labels: method, route, status_code
 * Buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
 */
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

/**
 * Counter metric for total number of HTTP requests processed.
 * Labels: method, route, status_code
 */
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Gauge metric tracking active HTTP connections.
 */
const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of currently active HTTP connections',
  registers: [register],
});

/**
 * Counter metric tracking domain-specific todo operations (create, update, delete, read).
 * Labels: operation
 */
const todoOperations = new client.Counter({
  name: 'todo_operations_total',
  help: 'Total number of todo operations performed',
  labelNames: ['operation'],
  registers: [register],
});

/**
 * Express middleware to record request duration and increment request counters.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Next middleware callback
 */
const metricsMiddleware = (req, res, next) => {
  activeConnections.inc();
  const endTimer = httpRequestDuration.startTimer();

  res.on('finish', () => {
    activeConnections.dec();

    const route = (req.baseUrl || '') + (req.route ? req.route.path : req.path || 'unknown');
    const statusCode = res.statusCode ? res.statusCode.toString() : 'unknown';
    const method = req.method;

    // Record request latency into histogram
    endTimer({
      method,
      route,
      status_code: statusCode,
    });

    // Increment cumulative requests counter
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });
  });

  next();
};

/**
 * HTTP handler returning Prometheus text-format metrics.
 * Designed to be mounted at GET /metrics.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
};

module.exports = {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  activeConnections,
  todoOperations,
  metricsMiddleware,
  metricsEndpoint,
};
