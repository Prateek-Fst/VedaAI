import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;

let redisAvailable = false;

export const redisConnection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null, // Required by BullMQ
  lazyConnect: true, // Prevent immediate connect on instantiate
  enableOfflineQueue: false, // Do not queue commands while offline
  retryStrategy(times) {
    // Returning null stops reconnecting completely and prevents infinite console retries
    return null;
  }
});

// Intercept background network socket errors to prevent raw stderr console logging
redisConnection.on('error', (err) => {
  // Intercepted silently
});

export const isRedisAvailable = () => redisAvailable;

export const QUEUE_NAME = 'assignment-generation';

export let assignmentQueue: Queue | null = null;

export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    await redisConnection.connect();
    redisAvailable = true;
    assignmentQueue = new Queue(QUEUE_NAME, { connection: redisConnection as any });
    console.log(`📡 BullMQ Queue configured (Redis: ${redisHost}:${redisPort})`);
    return true;
  } catch (err: any) {
    redisAvailable = false;
    assignmentQueue = null;
    console.warn('⚠️ Redis is not running locally. BullMQ will run in dual/mock-fallback mode.');
    return false;
  }
};
