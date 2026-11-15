"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const config_1 = require("../config");
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected internal server error occurred';
    // Log error with context
    if (statusCode >= 500) {
        console.error(`💥 [Error] ${req.method} ${req.originalUrl}:`, err);
    }
    else {
        console.warn(`⚠️ [Warning] ${req.method} ${req.originalUrl} (${statusCode}): ${message}`);
    }
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(err.details && { details: err.details }),
            ...(config_1.config.env === 'development' && { stack: err.stack }),
        },
    });
};
exports.errorHandler = errorHandler;
