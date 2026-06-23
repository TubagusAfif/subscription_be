import { Response, NextFunction } from 'express';
import { PaymentMethodService } from '../services/payment-method.service';
import { PaymentMethodMapper } from '../mappers/payment-method.mapper';
import { successResponse } from '../utils/response.util';
import type { AuthenticatedRequest } from '../types/typed-request';

export interface SharedPaymentMethodControllerDeps {
  paymentMethodService: PaymentMethodService;
}

export class SharedPaymentMethodController {
  private readonly paymentMethodService: PaymentMethodService;

  constructor(deps: SharedPaymentMethodControllerDeps) {
    this.paymentMethodService = deps.paymentMethodService;
  }

  getActivePaymentMethods = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.paymentMethodService.getActivePaymentMethods();
      res.status(200).json(successResponse(PaymentMethodMapper.toListResponse(data)));
    } catch (error) {
      next(error);
    }
  };
}
