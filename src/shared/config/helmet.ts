import helmet from 'helmet';
import { env } from './env';

const isProduction = env.NODE_ENV === 'production';

// Helmet configuration — Security Headers.
export const helmetConfig = helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
          connectSrc: ["'self'"],
        },
      }
    : false, // Disabled in dev to avoid blocking Swagger UI / hot-reload
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false, // Disabled in dev — no HTTPS on localhost
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
