import { Response, NextFunction } from 'express';
import { PaymentMethodService } from '../services/payment-method.service';
import { PaymentMethodMapper } from '../mappers/payment-method.mapper';
import { successResponse } from '../utils/response.util';
import type { AuthenticatedRequest } from '../types/typed-request';
import { env } from '../config/env';

export interface SharedPaymentMethodControllerDeps {
  paymentMethodService: PaymentMethodService;
}

export class SharedPaymentMethodController {
  private readonly paymentMethodService: PaymentMethodService;

  constructor(deps: SharedPaymentMethodControllerDeps) {
    this.paymentMethodService = deps.paymentMethodService;
  }

  getActivePaymentMethods = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const isOwner = req.user.role === 'OWNER';
      const data = await this.paymentMethodService.getActivePaymentMethods(isOwner, env.PAYMENT_GATEWAY);
      let mappedData: any = data.map((pm) => PaymentMethodMapper.toResponse(pm, isOwner));

      if (isOwner) {
        mappedData = {
          payment_gateway: env.PAYMENT_GATEWAY,
          data: mappedData,
        };
      }

      res.status(200).json(successResponse(mappedData));

    } catch (error) {
      next(error);
    }
  };
}
