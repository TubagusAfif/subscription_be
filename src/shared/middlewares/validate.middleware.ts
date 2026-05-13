import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodObject, ZodError } from 'zod';
import { AppError } from './error.middleware';

// Validate incoming request data against a Zod schema.
export const validate = (schema: ZodObject<any>): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign validated & coerced data back to prevent any/unknown leakage
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query as typeof req.query;
      if (parsed.params) req.params = parsed.params as typeof req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const field = issue.path.join('.'); // e.g., 'body.email'
          formattedErrors[field] = issue.message;
        });
        return next(
          new AppError('VALIDATION_ERROR', 'Input validation failed', 400, formattedErrors),
        );
      }
      next(error);
    }
  };
};

