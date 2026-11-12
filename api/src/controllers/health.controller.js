const { getIsConnected, getConnectionDetails } = require('../config/db');

const startTime = Date.now();

/**
 * GET /health
 * System health and diagnostic check for containers and load balancers.
 */
const getHealthStatus = (req, res) => {
  const isDbConnected = getIsConnected();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const dbDetails = getConnectionDetails();

  const healthPayload = {
    status: isDbConnected ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: 'healthy',
        uptimeSeconds,
        memoryUsage: process.memoryUsage(),
      },
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        readyState: dbDetails.readyState,
        host: dbDetails.host,
        name: dbDetails.name,
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
