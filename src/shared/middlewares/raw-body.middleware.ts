import { Request, Response, NextFunction } from 'express';

/**
 * Extends the Express Request interface to include the raw body buffer.
 * Used by webhook handlers that need the exact bytes for signature verification.
 */
declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

/**
 * Middleware that captures the raw request body as a string before JSON parsing.
 * Must be mounted BEFORE express.json() for the routes that need it.
 *
 * Usage:
 *   router.post('/webhook', captureRawBody, express.json(), handler);
 */
export const captureRawBody = (req: Request, res: Response, next: NextFunction): void => {
  let data = '';
  req.setEncoding('utf8');

  req.on('data', (chunk: string) => {
    data += chunk;
  });

  req.on('end', () => {
    req.rawBody = data;

    // Parse JSON manually so downstream handlers see req.body
    if (data) {
      try {
        req.body = JSON.parse(data);
      } catch {
        // If not valid JSON, leave body empty — the controller will handle it
        req.body = {};
      }
    }

    next();
  });

  req.on('error', (err: Error) => {
    next(err);
  });
};
