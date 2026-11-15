const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /auth/register - Register new account
router.post('/register', authLimiter, authController.register);

// POST /auth/login - Authenticate with credentials
router.post('/login', authLimiter, authController.login);

// POST /auth/refresh - Refresh access token
router.post('/refresh', authController.refresh);

// GET /auth/me - Get current user profile
router.get('/me', authenticate, authController.getMe);

// POST /auth/logout - Invalidate session
router.post('/logout', authenticate, authController.logout);

module.exports = router;
