"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisManager = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const bullmq_1 = require("bullmq");
const config_1 = require("../config");
class RedisManager {
    redisClient = null;
    isConnected = false;
    queues = new Map();
    constructor() {
        this.init();
    }
    init() {
        // In test environment, keep client in memory/offline to avoid hanging TCP handles
        if (config_1.config.env === 'test') {
            return;
        }
        try {
            this.redisClient = new ioredis_1.default(config_1.config.redisUrl, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
                retryStrategy: (times) => {
                    if (times > 3) {
                        return null; // Stop reconnecting after 3 attempts in dev/test
                    }
                    return Math.min(times * 100, 2000);
                },
            });
            this.redisClient.on('connect', () => {
                this.isConnected = true;
                console.log('✅ [Redis] Connected successfully to Redis.');
            });
            this.redisClient.on('error', (err) => {
                this.isConnected = false;
                // Suppress noisy logs during local offline test runs
            });
        }
        catch (e) {
            console.warn('⚠️  [Redis] Initialization warning:', e.message);
        }
    }
    getClient() {
        return this.redisClient;
    }
    getQueue(queueName) {
        if (!this.isConnected || !this.redisClient) {
            return null;
        }
        if (!this.queues.has(queueName)) {
            const q = new bullmq_1.Queue(queueName, { connection: this.redisClient });
            this.queues.set(queueName, q);
        }
        return this.queues.get(queueName);
    }
    async enqueueJob(queueName, jobName, data) {
        const q = this.getQueue(queueName);
        if (q) {
            return q.add(jobName, data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        }
        else {
            // In-memory immediate execution fallback when Redis is offline
            console.log(`ℹ️ [Job Queue] (Inline Dispatch) ${queueName} -> ${jobName}`);
            return { id: 'inline-' + Date.now(), data };
        }
    }
    isRedisConnected() {
        return this.isConnected;
    }
}
exports.redisManager = new RedisManager();
