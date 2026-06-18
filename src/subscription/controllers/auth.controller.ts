import { Request, Response, NextFunction } from 'express';
import { SubscriptionAuthService } from '../services/auth.service';
import { TokenService } from '../../shared/services/token.service';
import { successResponse } from '../../shared/utils/response.util';
import { AuthMapper } from '../../shared/mappers/auth.mapper';
import { AppError } from '../../shared/middlewares/error.middleware';


export interface SubscriptionAuthControllerDeps {
  subscriptionAuthService: SubscriptionAuthService;
  tokenService: TokenService;
}

/** 
---------------------------------------------------------------
  Controller orchestrating subscription admin authentication requests.
---------------------------------------------------------------
**/
export class SubscriptionAuthController {
  private readonly authService: SubscriptionAuthService;
  private readonly tokenService: TokenService;

  constructor(deps: SubscriptionAuthControllerDeps) {
    this.authService = deps.subscriptionAuthService;
    this.tokenService = deps.tokenService;
  }

  /** 
  ---------------------------------------------------------------
    Logs in a subscription admin and provides access tokens upon success.
  ---------------------------------------------------------------
  **/
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.authService.login(req.body);

      const tokens = await this.tokenService.generateTokens(user.id, user.role);
      
      res.cookie('refreshToken_subscription', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json(successResponse(AuthMapper.toAuthResponse(user, { accessToken: tokens.accessToken })));
    } catch (error) {
      next(error);
    }
  };
}
