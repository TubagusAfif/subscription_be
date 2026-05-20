import cors from 'cors';
import { RequestHandler } from 'express';
import { env } from './env';
import { logger } from './logger';

const isProduction = env.NODE_ENV === 'production';


// CORS configuration.
const allowedOrigins: string[] = [
  env.CLIENT_APP_URL,
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()) : []),
].filter(Boolean);

export const corsConfig: RequestHandler = cors({
  origin: isProduction
    ? (origin, callback) => {
        // Allow requests with no origin (e.g., server-to-server, curl, mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        logger.warn(`CORS blocked request from origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
