import { Request, Response, NextFunction } from 'express';
import { ClientAuthService } from '../services/auth.service';
import { TokenService } from '../../shared/services/token.service';
import { successResponse } from '../../shared/utils/response.util';
import { AuthMapper } from '../../shared/mappers/auth.mapper';
import { AppError } from '../../shared/middlewares/error.middleware';


export interface ClientAuthControllerDeps {
  clientAuthService: ClientAuthService;
  tokenService: TokenService;
}

/** 
---------------------------------------------------------------
  Controller orchestrating client authentication requests like login, register and activate.
---------------------------------------------------------------
**/
export class ClientAuthController {
  private readonly authService: ClientAuthService;
  private readonly tokenService: TokenService;

  constructor(deps: ClientAuthControllerDeps) {
    this.authService = deps.clientAuthService;
    this.tokenService = deps.tokenService;
  }

  /** 
  ---------------------------------------------------------------
    Registers a new client. Does NOT issue tokens — user must activate via email first.
  ---------------------------------------------------------------
  **/
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /** 
  ---------------------------------------------------------------
    Activates a user account via token.
  ---------------------------------------------------------------
  **/
  activate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.activate(req.body.token);
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /** 
  ---------------------------------------------------------------
    Initiates the forgot password flow by emailing a reset link.
  ---------------------------------------------------------------
  **/
  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.forgotPassword(req.body);
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /** 
  ---------------------------------------------------------------
    Resets a user's password using the token sent to their email.
  ---------------------------------------------------------------
  **/
  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.resetPassword(req.body);
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /** 
  ---------------------------------------------------------------
    Logs in an existing client user and generates fresh tokens.
  ---------------------------------------------------------------
  **/
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.authService.login(req.body);
      if (user.role !== 'OWNER') {
        throw new AppError('FORBIDDEN', 'Access denied. Only owners can log in here.', 403);
      }
      const tokens = await this.tokenService.generateTokens(user.id, user.role);
      
      res.cookie('refreshToken_client', tokens.refreshToken, {
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

  /** 
  ---------------------------------------------------------------
    Resends the activation email for an unactivated account.
  ---------------------------------------------------------------
  **/
  resendActivation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.resendActivation(req.body);
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };
}
