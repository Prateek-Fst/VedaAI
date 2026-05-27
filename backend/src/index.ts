import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import { checkRedisConnection } from './config/queue';
import { initWorker } from './workers/assignmentWorker';
import assignmentRoutes from './routes/assignmentRoutes';

// Load Environment Variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Set up Middlewares
app.use(cors({ origin: '*' })); // Allow cross-origin communication for development
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files from Public Directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Mount API Routes
app.use('/api/assignments', assignmentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Global Error Captured:', err.stack || err);
  res.status(500).json({ error: err.message || 'Something went wrong on the server!' });
});

// Bootstrap Asynchronous Server Startup
const startServer = async () => {
  try {
    console.log('🏁 Starting VedaAI Backend Bootloader...');
    
    // 1. Establish Database Connection
    await connectDB();

    // 2. Initialize WebSockets
    initSocket(server);

    // 3. Establish Redis connection & prepare BullMQ (silently falls back if offline)
    await checkRedisConnection();

    // 4. Initialize background queue workers
    initWorker();

    // 5. Start the Server
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`🚀 VedaAI Express Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 Health Check URL: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api/assignments`);
    });
  } catch (startupError) {
    console.error('❌ Fatal server startup error encountered:', startupError);
    process.exit(1);
  }
};

startServer();
