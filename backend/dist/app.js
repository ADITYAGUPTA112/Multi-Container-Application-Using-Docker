"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const db_1 = require("./db");
const redis_1 = require("./db/redis");
const createApp = () => {
    const app = (0, express_1.default)();
    // Security & Utility Middlewares
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use((0, cors_1.default)({
        origin: config_1.config.corsOrigin === '*' ? true : [config_1.config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
    }));
    if (config_1.config.env !== 'test') {
        app.use((0, morgan_1.default)('dev'));
    }
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Static uploads directory (for previewing uploaded documents/attachments)
    app.use('/uploads', express_1.default.static(config_1.config.uploads.dir));
    // Healthcheck endpoint
    app.get('/health', async (req, res) => {
        res.json({
            status: 'healthy',
            service: 'MindVault API Backend',
            version: '1.0.0',
            uptime_seconds: Math.floor(process.uptime()),
            database_connected: db_1.db.isDbConnected(),
            redis_connected: redis_1.redisManager.isRedisConnected(),
            timestamp: new Date().toISOString(),
        });
    });
    // Mount API v1 Routes
    app.use(config_1.config.apiPrefix, routes_1.default);
    // 404 Catch-All
    app.use((req, res, next) => {
        next(new errorHandler_1.AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
    });
    // Centralized Error Handler
    app.use(errorHandler_1.errorHandler);
    return app;
};
exports.createApp = createApp;
