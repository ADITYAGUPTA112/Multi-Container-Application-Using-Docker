const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * OpenAPI 3.0.3 Specification Definition for Multi-Container Todo API.
 */
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Multi-Container Todo API',
    version: '2.0.0',
    description: `## Multi-Container Todo API Documentation

A resilient, scalable RESTful API service for task management built with Express, MongoDB, and Redis.

### Full Feature List:
- **Resilient Multi-Container Architecture**: Docker & Docker Compose orchestrated environment (API, MongoDB, Redis, Nginx Reverse Proxy).
- **Resilient MongoDB Connectivity**: Automated connection lifecycle management with exponential backoff and connection pooling.
- **High-Performance Redis Caching**: Intelligent response caching middleware with custom TTL and pattern-based cache invalidation.
- **Tiered Rate Limiting**: Multi-tier protection using express-rate-limit:
  - Global Limiter (200 req / 15 min)
  - Auth Limiter (20 req / 15 min)
  - API Limiter (100 req / 15 min)
- **Real-Time WebSockets**: Socket.IO event broadcasting for real-time synchronization (\`todo:created\`, \`todo:updated\`, \`todo:deleted\`).
- **Structured Winston Logging**: Centralized JSON logging with error stack traces, console colorization, and Morgan HTTP request streaming.
- **Prometheus Metrics Telemetry**: Full Prometheus observability with default Node.js runtime metrics and custom HTTP histograms/counters at \`/metrics\`.
- **OpenAPI 3.0.3 & Swagger UI**: Interactive API documentation and schema validation with Bearer JWT security scheme.
- **Comprehensive Health Probes**: Diagnostic health check endpoint reporting detailed API and database status.`,
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication and user management operations',
    },
    {
      name: 'Todos',
      description: 'Todo item management and operations',
    },
    {
      name: 'Health',
      description: 'Service health check and diagnostic probes',
    },
    {
      name: 'Metrics',
      description: 'Prometheus monitoring and metrics collection',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Todo: {
        type: 'object',
        required: ['title'],
        properties: {
          _id: {
            type: 'string',
            example: '6645a2789f1d2b456e890123',
            description: 'Unique MongoDB ObjectId identifier',
          },
          title: {
            type: 'string',
            example: 'Configure Redis Caching',
            description: 'Title of the todo item',
          },
          description: {
            type: 'string',
            example: 'Integrate ioredis client and caching middleware',
            description: 'Optional description of the task',
          },
          isCompleted: {
            type: 'boolean',
            example: false,
            description: 'Completion status of the task',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-11-15T10:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-11-15T10:00:00.000Z',
          },
        },
      },
      TodoInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: {
            type: 'string',
            example: 'Configure Redis Caching',
          },
          description: {
            type: 'string',
            example: 'Integrate ioredis client and caching middleware',
          },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Validation failed for request input',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
    },
  },
};

// ============================================================================
// Example Route Definitions with JSDoc / Swagger Annotations
// ============================================================================

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: testuser
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecretPassword123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error or duplicate user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate a user and receive a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: testuser
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecretPassword123!
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /todos:
 *   get:
 *     summary: Retrieve all todos
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: completed
 *         schema:
 *           type: boolean
 *         description: Filter todos by completion status
 *     responses:
 *       200:
 *         description: A list of todos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Todo'
 *   post:
 *     summary: Create a new todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TodoInput'
 *     responses:
 *       201:
 *         description: Todo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /todos/{id}:
 *   get:
 *     summary: Retrieve a single todo by ID
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ObjectId of the todo
 *     responses:
 *       200:
 *         description: Todo found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update an existing todo by ID
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ObjectId of the todo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               isCompleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Todo not found
 *   delete:
 *     summary: Delete a todo by ID
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ObjectId of the todo
 *     responses:
 *       200:
 *         description: Todo deleted successfully
 *       404:
 *         description: Todo not found
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get service health status and dependency diagnostics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy and all dependencies are UP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 124.5
 *                 services:
 *                   type: object
 *                   properties:
 *                     api:
 *                       type: string
 *                       example: UP
 *                     database:
 *                       type: string
 *                       example: UP
 *       503:
 *         description: Service is degraded or database is DOWN
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Prometheus exposition format text containing application and runtime metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "# HELP http_requests_total Total number of HTTP requests processed\n# TYPE http_requests_total counter\nhttp_requests_total{method=\"GET\",route=\"/todos\",status_code=\"200\",app=\"todo-api\"} 42"
 */

const swaggerOptions = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/*.js'),
    __filename,
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerSpec,
  swaggerUi,
};
