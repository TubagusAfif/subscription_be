import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middlewares/error.middleware';
import { TokenService } from '../services/token.service';
import { successResponse } from '../utils/response.util';

export interface SharedAuthControllerDeps {
  tokenService: TokenService;
}

/** 
---------------------------------------------------------------
  Controller handling shared authentication concerns like token rotation and logout.
---------------------------------------------------------------
**/
export class SharedAuthController {
  private readonly tokenService: TokenService;

  constructor(deps: SharedAuthControllerDeps) {
    this.tokenService = deps.tokenService;
  }

  /** 
  ---------------------------------------------------------------
    Handles rotating an existing refresh token for a new set of access/refresh tokens.
  ---------------------------------------------------------------
  **/
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = req.body.app;
      const cookieName = app === 'subscription' ? 'refreshToken_subscription' : 'refreshToken_client';
      const refreshToken = req.cookies[cookieName];
      
      if (!refreshToken) {
        throw new AppError('UNAUTHORIZED', 'No refresh token provided in cookies', 401);
      }
      const tokens = await this.tokenService.rotateRefreshToken(refreshToken);
      
      res.cookie(cookieName, tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json(successResponse({ tokens: { accessToken: tokens.accessToken } }));
    } catch (error) {
      next(error);
    }
  };

  /** 
  ---------------------------------------------------------------
    Logs a user out by revoking their active refresh token.
  ---------------------------------------------------------------
  **/
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = req.body.app;
      const cookieName = app === 'subscription' ? 'refreshToken_subscription' : 'refreshToken_client';
      const refreshToken = req.cookies[cookieName] || req.cookies.refreshToken;
      
      if (refreshToken) {
        await this.tokenService.revokeRefreshToken(refreshToken);
      }
      
      res.clearCookie(cookieName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      // Always clear the legacy one just in case
      res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      
      res.status(200).json(successResponse({ message: 'Logged out successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
