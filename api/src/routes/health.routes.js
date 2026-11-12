const express = require('express');
const router = express.Router();
const { getHealthStatus } = require('../controllers/health.controller');

// GET /health - Check system and database health
router.get('/', getHealthStatus);

module.exports = router;
