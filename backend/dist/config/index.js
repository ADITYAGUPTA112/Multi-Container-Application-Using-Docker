"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config(); // fallback to local directory .env
exports.config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    apiPrefix: process.env.API_PREFIX || '/api/v1',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://mindvault_user:mindvault_secure_password_2026@localhost:5432/mindvault?schema=public',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'super_secret_access_jwt_key_mindvault_2026_xyz',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_mindvault_2026_abc',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    uploads: {
        dir: path_1.default.resolve(__dirname, '../../uploads'),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE_BYTES || '26214400', 10), // 25MB
        allowedMimeTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
        ],
    },
};
