const { Server } = require('socket.io');

/**
 * Socket.IO server singleton reference.
 * @type {import('socket.io').Server|null}
 */
let io = null;

/**
 * Supported real-time todo lifecycle events.
 */
const TODO_EVENTS = ['todo:created', 'todo:updated', 'todo:deleted'];

/**
 * Initializes the Socket.IO server instance attached to an HTTP server.
 *
 * @param {import('http').Server} httpServer - Node.js HTTP server instance
 * @returns {import('socket.io').Server} Initialized Socket.IO server
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket.IO] Error for socket ${socket.id}:`, err.message);
    });
  });

  return io;
};

/**
 * Emits a real-time event to all connected Socket.IO clients.
 * Handled gracefully (returns silently) if Socket.IO is not initialized.
 *
 * Supported events: 'todo:created', 'todo:updated', 'todo:deleted'
 *
 * @param {'todo:created'|'todo:updated'|'todo:deleted'} eventName - The event name
 * @param {any} data - Data payload to broadcast
 */
const emitTodoEvent = (eventName, data) => {
  if (!io) {
    return;
  }

  try {
    io.emit(eventName, data);
  } catch (err) {
    console.error(`[Socket.IO] Error emitting event "${eventName}":`, err.message);
  }
};

/**
 * Returns the current Socket.IO server instance.
 *
 * @returns {import('socket.io').Server|null}
 */
const getIO = () => {
  return io;
};

module.exports = {
  initializeSocket,
  emitTodoEvent,
  getIO,
};
