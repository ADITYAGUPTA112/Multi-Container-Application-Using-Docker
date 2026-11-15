"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const db_1 = require("./db");
const startServer = async () => {
    console.log('🚀 Initializing MindVault Backend Services...');
    // Connect to PostgreSQL database
    await db_1.db.connect();
    const app = (0, app_1.createApp)();
    const server = app.listen(config_1.config.port, () => {
        console.log(`✨ MindVault Backend API server running on port ${config_1.config.port} (${config_1.config.env})`);
        console.log(`🔗 API Base URL: http://localhost:${config_1.config.port}${config_1.config.apiPrefix}`);
        console.log(`🩺 Healthcheck: http://localhost:${config_1.config.port}/health`);
    });
    const handleShutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
        server.close(async () => {
            await db_1.db.close();
            console.log('🔒 Database connections closed. Process terminating safely.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
};
startServer().catch((err) => {
    console.error('❌ Fatal error starting MindVault Backend:', err);
    process.exit(1);
});
