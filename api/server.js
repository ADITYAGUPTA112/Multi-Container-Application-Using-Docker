require('dotenv').config();

const app = require('./src/app');
const { connectWithRetry, closeDatabaseConnection } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(` Multi-Container Todo API Service`);
  console.log(` Running on port: http://localhost:${PORT}`);
  console.log(` Environment:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);

  // Initialize resilient database connection loop
  await connectWithRetry();
});

// Handle graceful shutdown
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await closeDatabaseConnection();
    console.log('[Server] Graceful shutdown process complete. Exiting.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if lingering connections exist
  setTimeout(() => {
    console.error('[Server] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

module.exports = server;
