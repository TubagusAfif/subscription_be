import { Response, NextFunction } from 'express';
import { AccountService } from '../services/account.service';
import { AccountMapper } from '../mappers/account.mapper';
import { successResponse } from '../utils/response.util';
import type { AuthenticatedRequest } from '../types/typed-request';
import type { UpdateAccountBody, ChangePasswordBody } from '../validations/account.validation';

export interface AccountControllerDeps {
  accountService: AccountService;
}

/**
 * Controller handling user account profile operations.
 */
export class AccountController {
  private readonly accountService: AccountService;

  constructor(deps: AccountControllerDeps) {
    this.accountService = deps.accountService;
  }

  /**
   * Fetch current authenticated user's profile.
   */
  getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.sub;
      const account = await this.accountService.getAccount(userId);
      res.status(200).json(successResponse(AccountMapper.toAccountResponse(account)));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update current authenticated user's base information and profile.
   */
  updateMe = async (
    req: AuthenticatedRequest<UpdateAccountBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.sub;
      const data = req.body;
      const updatedAccount = await this.accountService.updateAccount(userId, data);
      res.status(200).json(successResponse(AccountMapper.toAccountResponse(updatedAccount)));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change current authenticated user's password.
   */
  changePassword = async (
    req: AuthenticatedRequest<ChangePasswordBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.sub;
      const data = req.body;
      await this.accountService.changePassword(userId, data);
      res.status(200).json(successResponse({ message: 'Password updated successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
