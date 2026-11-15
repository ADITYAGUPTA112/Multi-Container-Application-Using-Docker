"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getMe = exports.refresh = exports.login = exports.register = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = require("../db");
const config_1 = require("../config");
const errorHandler_1 = require("../middleware/errorHandler");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address format'),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
        full_name: zod_1.z.string().min(2, 'Full name must be at least 2 characters'),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.refreshSchema = zod_1.z.object({
    body: zod_1.z.object({
        refresh_token: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
});
const register = async (req, res, next) => {
    try {
        const { email, password, full_name } = req.body;
        // Check if user already exists
        const existing = await db_1.db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            throw new errorHandler_1.AppError('An account with this email address already exists', 409, 'EMAIL_EXISTS');
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const password_hash = await bcryptjs_1.default.hash(password, salt);
        // Insert user
        const insertRes = await db_1.db.query(`INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, avatar_url, created_at`, [email.toLowerCase(), password_hash, full_name]);
        const user = insertRes.rows[0];
        // Create default folders & tags for new user
        await db_1.db.query(`INSERT INTO folders (user_id, name, color, icon)
       VALUES ($1, 'General', '#7c3aed', 'Folder'),
              ($1, 'Research', '#06b6d4', 'BookOpen')
       ON CONFLICT DO NOTHING`, [user.id]);
        // Issue tokens
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessExpiresIn });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_1.config.jwt.refreshSecret, { expiresIn: config_1.config.jwt.refreshExpiresIn });
        res.status(201).json({
            success: true,
            data: {
                user,
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_type: 'Bearer',
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await db_1.db.query('SELECT id, email, password_hash, full_name, avatar_url, is_active FROM users WHERE email = $1', [email.toLowerCase()]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }
        const user = result.rows[0];
        if (!user.is_active) {
            throw new errorHandler_1.AppError('Account is disabled. Please contact support.', 403, 'ACCOUNT_DISABLED');
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            throw new errorHandler_1.AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessExpiresIn });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_1.config.jwt.refreshSecret, { expiresIn: config_1.config.jwt.refreshExpiresIn });
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    avatar_url: user.avatar_url,
                },
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_type: 'Bearer',
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.login = login;
const refresh = async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refresh_token, config_1.config.jwt.refreshSecret);
        }
        catch (e) {
            throw new errorHandler_1.AppError('Refresh token is invalid or expired', 401, 'INVALID_REFRESH_TOKEN');
        }
        const userRes = await db_1.db.query('SELECT id, email, is_active FROM users WHERE id = $1', [decoded.id]);
        if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
            throw new errorHandler_1.AppError('User not found or inactive', 401, 'USER_INACTIVE');
        }
        const user = userRes.rows[0];
        const newAccessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessExpiresIn });
        res.json({
            success: true,
            data: {
                access_token: newAccessToken,
                token_type: 'Bearer',
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.refresh = refresh;
const getMe = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await db_1.db.query(`SELECT id, email, full_name, avatar_url, created_at,
              (SELECT COUNT(*) FROM notes WHERE user_id = $1 AND is_archived = false)::int as note_count,
              (SELECT COUNT(*) FROM documents WHERE user_id = $1)::int as document_count,
              (SELECT COUNT(*) FROM folders WHERE user_id = $1)::int as folder_count
       FROM users WHERE id = $1`, [userId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('User not found', 404, 'USER_NOT_FOUND');
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getMe = getMe;
const logout = async (req, res) => {
    // Can add refresh token to Redis blacklist if needed
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
};
exports.logout = logout;
