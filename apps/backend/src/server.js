import 'dotenv/config';

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import app from './app.js';
import { connectDB } from './config/database.js';
console.log("redit 1");
import { connectRedis } from './config/redis.js';
console.log("redit 2");
import { initFirebase } from './config/firebase.js';
import { initializeSocket } from './sockets/index.js';
import { startJobs } from './jobs/index.js';
import { logger } from './middlewares/error.middleware.js';

const PORT = process.env.PORT || 5000;

const logsDir = path.join(__dirname, '../logs');
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const startServer = async () => {
  try {
    await connectDB();
    
    try {
      await connectRedis();
    } catch (error) {
      console.warn('Redis connection failed, continuing without Redis:', error.message);
    }

    try {
      initFirebase();
    } catch (error) {
      console.warn('Firebase initialization failed:', error.message);
    }

    startJobs();

    const server = http.createServer(app);

    initializeSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API URL: http://localhost:${PORT}/api/v1`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        const mongoose = (await import('mongoose')).default;
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    });

    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught Exception: ${error.message}`);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
