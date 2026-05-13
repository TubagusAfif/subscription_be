import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { logger } from '../config/logger';
import { errorResponse } from '../utils/response.util';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
  }

  // Log the full error internally — never expose to client
  logger.error('Unhandled Exception:', { error: err.message, stack: err.stack });
  Sentry.captureException(err);

  // Sanitized response: generic message, no table/column names or stack traces
  return res
    .status(500)
    .json(
      errorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred. Please try again later.',
      ),
    );
};
