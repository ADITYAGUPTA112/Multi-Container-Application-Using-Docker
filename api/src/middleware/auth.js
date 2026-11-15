const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';

// Default guest identity for open-access workspace
const DEFAULT_WORKSPACE_USER = {
  _id: '6640abcde123456789012345',
  id: '6640abcde123456789012345',
  name: 'Workspace Engineer',
  email: 'engineer@cluster.local',
  role: 'admin',
};

/**
 * Authentication middleware
 * If a valid Bearer token is provided, authenticates the specific user.
 * If no token is provided, seamlessly assigns the default workspace user
 * so no sign-in or sign-up is required.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = DEFAULT_WORKSPACE_USER;
      return next();
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // In case of invalid/expired token, fallback gracefully to default workspace user
      req.user = DEFAULT_WORKSPACE_USER;
      return next();
    }

    const userId = decoded.userId || decoded.id || decoded._id;

    let user = null;
    try {
      user = await User.findById(userId).select('-password');
    } catch (err) {
      // Fallback below
    }

    if (!user) {
      user = {
        _id: userId,
        id: userId,
        name: decoded.name || 'Workspace User',
        email: decoded.email || '',
        role: decoded.role || 'user',
      };
    }

    req.user = user;
    next();
  } catch (err) {
    req.user = DEFAULT_WORKSPACE_USER;
    next();
  }
};

/**
 * Role-based authorization middleware for admin access
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required.',
        timestamp: new Date().toISOString(),
      },
    });
  }
  next();
};

module.exports = {
  authenticate,
  authorizeAdmin,
};
