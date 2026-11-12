const mongoose = require('mongoose');

const MAX_RETRIES = 10;
const INITIAL_RETRY_INTERVAL_MS = 2000;

let currentRetry = 0;
let isConnected = false;

/**
 * Connect to MongoDB with exponential backoff retry mechanism.
 */
const connectWithRetry = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/todos_db';

  try {
    console.log(`[Database] Attempting connection to MongoDB (Attempt ${currentRetry + 1}/${MAX_RETRIES})...`);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    currentRetry = 0;
    console.log(`[Database] Successfully connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    isConnected = false;
    currentRetry += 1;
    console.error(`[Database] Connection attempt failed: ${err.message}`);

    if (currentRetry < MAX_RETRIES) {
      const waitTime = Math.min(INITIAL_RETRY_INTERVAL_MS * Math.pow(1.5, currentRetry - 1), 30000);
      console.log(`[Database] Reconnecting in ${Math.round(waitTime / 1000)}s...`);
      setTimeout(connectWithRetry, waitTime);
    } else {
      console.error('[Database] Exceeded maximum connection retries. Please check MongoDB service.');
    }
  }
};

// Listen to Mongoose connection events
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database] Lost MongoDB connection.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('[Database] Reconnected to MongoDB.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] Mongoose error: ${err.message}`);
});

/**
 * Gracefully close database connection on process termination.
 */
const closeDatabaseConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB connection closed through app termination.');
  } catch (err) {
    console.error(`[Database] Error during disconnection: ${err.message}`);
  }
};

module.exports = {
  connectWithRetry,
  closeDatabaseConnection,
  getIsConnected: () => isConnected || mongoose.connection.readyState === 1,
  getConnectionDetails: () => ({
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    port: mongoose.connection.port || null,
    name: mongoose.connection.name || null,
  }),
};
