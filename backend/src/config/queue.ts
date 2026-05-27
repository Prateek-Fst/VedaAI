import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL ? process.env.REDIS_URL.replace(/^"|"$/g, '') : undefined;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;

let redisAvailable = false;

const ioredisOptions: any = {
  maxRetriesPerRequest: null, // Required by BullMQ
  lazyConnect: true, // Prevent immediate connect on instantiate
  enableOfflineQueue: false, // Do not queue commands while offline
  retryStrategy(times: number) {
    // Returning null stops reconnecting completely and prevents infinite console retries
    return null;
  }
};

// Enable explicit TLS configuration for secure rediss:// cloud connections
if (redisUrl && redisUrl.startsWith('rediss://')) {
  ioredisOptions.tls = { rejectUnauthorized: false };
}

// Intercept background network socket errors to prevent raw stderr console logging
const createRedisConnection = () => {
  const conn = redisUrl
    ? new IORedis(redisUrl, ioredisOptions)
    : new IORedis({
        host: redisHost,
        port: redisPort,
        ...ioredisOptions
      });
  
  conn.on('error', (err) => {
    // Intercepted silently
  });
  
  return conn;
};

export const redisConnection = createRedisConnection();

export const isRedisAvailable = () => redisAvailable;

export const QUEUE_NAME = 'assignment-generation';

export let assignmentQueue: Queue | null = null;

export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    await redisConnection.connect();
    redisAvailable = true;
    assignmentQueue = new Queue(QUEUE_NAME, { connection: redisConnection as any });
    const activeHost = redisUrl ? 'Upstash Cloud' : `${redisHost}:${redisPort}`;
    console.log(`📡 BullMQ Queue configured (Redis: ${activeHost})`);
    return true;
  } catch (err: any) {
    redisAvailable = false;
    assignmentQueue = null;
    console.warn(`⚠️ Redis connection failed: ${err.message}. BullMQ will run in dual/mock-fallback mode.`);
    return false;
  }
};
