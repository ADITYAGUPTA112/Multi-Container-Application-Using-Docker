const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const { globalLimiter } = require('./middleware/rateLimiter');
const { swaggerSpec } = require('./config/swagger');
const { metricsMiddleware, metricsEndpoint } = require('./config/metrics');
const { httpStream } = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const todoRoutes = require('./routes/todo.routes');
const healthRoutes = require('./routes/health.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// HTTP request logging streaming to Winston
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: httpStream,
  })
);

// Body parsing with strict payload limit (100KB per Security Document)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Serve static frontend client dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Prometheus telemetry metrics collection
app.use(metricsMiddleware);

// Global IP-based rate limiting applied before application routes
app.use(globalLimiter);

// Prometheus metrics endpoint
app.get('/metrics', metricsEndpoint);

// Interactive Swagger UI OpenAPI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root welcome & API metadata route
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'Multi-Container Todo API Service',
    version: '2.0.0',
    status: 'online',
    endpoints: {
      auth: '/auth',
      todos: '/todos',
      health: '/health',
      docs: '/api-docs',
      metrics: '/metrics',
    },
  });
});

// Mount application routers
app.use('/auth', authRoutes);
app.use('/todos', todoRoutes);
app.use('/health', healthRoutes);

// Undefined route 404 handler
app.use(notFoundHandler);

// Central error handling middleware
app.use(errorHandler);

module.exports = app;
