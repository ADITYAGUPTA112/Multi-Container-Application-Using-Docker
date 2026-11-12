const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const path = require('path');

const todoRoutes = require('./routes/todo.routes');
const healthRoutes = require('./routes/health.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security and standard middlewares
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Logging middleware (only concise logs in production)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsing with strict payload limit (100KB per Security Document)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Serve static frontend client dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Root welcome & API metadata route
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'Multi-Container Todo API Service',
    version: '1.0.0',
    documentation: '/todos',
    health: '/health',
    status: 'online',
  });
});

// Mount application routers
app.use('/todos', todoRoutes);
app.use('/health', healthRoutes);

// Undefined route 404 handler
app.use(notFoundHandler);

// Central error handling middleware
app.use(errorHandler);

module.exports = app;
