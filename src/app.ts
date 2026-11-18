import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { sendSuccess, sendError } from './utils/response.js';

export const app = express();

// ============================================================================
// Frontend URLs / Allowed Origins for CORS
// Yahan aap jitni bhi frontend URLs lagana chahe, is array me add kar sakte hain:
// ============================================================================
export const ALLOWED_ORIGINS: string[] = [
  'http://localhost:5173', // Vite Frontend (Default)
  'http://localhost:5174', // Vite Frontend (Alternative port)
  'http://localhost:3000', // React / Next.js
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'property-rentlock.netlify.app'
  // Nayi URLs yahan add kar sakte hain:
  // 'https://your-frontend-domain.com',
  // 'https://admin.yourdomain.com',
];

// Security & Utility Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in ALLOWED_ORIGINS
      const isAllowed = ALLOWED_ORIGINS.some(
        (url) => url.toLowerCase() === origin.toLowerCase()
      );

      // Allow matching origins or any localhost/127.0.0.1
      if (isAllowed || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }

      // In development mode, allow to prevent unexpected blocks
      if (env.NODE_ENV === 'development') {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
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
