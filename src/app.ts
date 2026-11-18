import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { sendSuccess, sendError } from './utils/response.js';

export const app = express();

// Security & Utility Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost and specified CORS_ORIGIN
      if (!origin || origin.includes('localhost') || origin === env.CORS_ORIGIN) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev mode
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// System Health Endpoint
app.get('/health', (_req, res) => {
  return sendSuccess(res, {
    status: 'UP',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Primary REST API Router
app.use('/api/v1', apiRouter);

// 404 Route Not Found Catch-All
app.use((req, res) => {
  return sendError(res, `Endpoint '${req.method} ${req.originalUrl}' does not exist on this server`, 404, 'NOT_FOUND');
});

// Centralized Global Error Handler
app.use(errorHandler);
