const os = require('os');
const mongoose = require('mongoose');
const { getIsConnected, getConnectionDetails } = require('../config/db');
const { redisClient } = require('../config/redis');

const startTime = Date.now();

/**
 * GET /health
 * Enhanced health check endpoint returning API, DB, Redis, and OS metrics.
 */
const getHealthStatus = async (req, res) => {
  const isDbConnected = getIsConnected();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const dbDetails = getConnectionDetails();

  // Measure MongoDB ping latency
  let dbLatency = null;
  if (isDbConnected && mongoose.connection.db) {
    const startDb = Date.now();
    try {
      await mongoose.connection.db.admin().ping();
      dbLatency = `${Date.now() - startDb}ms`;
    } catch (err) {
      dbLatency = 'error';
    }
  }

  // Measure Redis ping connectivity & latency
  let isRedisConnected = false;
  let redisLatency = null;
  if (redisClient) {
    const startRedis = Date.now();
    try {
      const pingRes = await redisClient.ping();
      if (pingRes === 'PONG') {
        isRedisConnected = true;
        redisLatency = `${Date.now() - startRedis}ms`;
      }
    } catch (err) {
      isRedisConnected = false;
      redisLatency = 'error';
    }
  }

  const healthPayload = {
    status: isDbConnected ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: 'healthy',
        uptimeSeconds,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        pid: process.pid,
      },
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        readyState: dbDetails.readyState,
        host: dbDetails.host,
        name: dbDetails.name,
        latency: dbLatency,
      },
      redis: {
        status: isRedisConnected ? 'connected' : 'disconnected',
        latency: redisLatency,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
      },
    },
  };

  if (!isDbConnected) {
    return res.status(503).json(healthPayload);
  }

  res.status(200).json(healthPayload);
};

module.exports = {
  getHealthStatus,
};
