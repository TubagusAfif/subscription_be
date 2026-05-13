import { Request, Response, NextFunction } from 'express';
import { TokenService, JWTPayload } from '../services/token.service';
import { AppError } from './error.middleware';
import { Role } from '@prisma/client';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user: JWTPayload;
    }
  }
}

export const createAuthenticateMiddleware = (tokenService: TokenService) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('UNAUTHORIZED', 'Missing or invalid token', 401));
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next(new AppError('UNAUTHORIZED', 'Missing or invalid token', 401));
    }

    try {
      const payload = tokenService.verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const authorize = (roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    logger.debug('[Authorize]', { expectedRoles: roles, userRole: req.user?.role });
    if (!req.user || !roles.includes(req.user.role as Role)) {
      return next(new AppError('FORBIDDEN', 'Access denied. Insufficient permissions.', 403));
    }

    next();
  };
};
