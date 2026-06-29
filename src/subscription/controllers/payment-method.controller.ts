import { Response, NextFunction } from 'express';
import { PaymentMethodService } from '../../shared/services/payment-method.service';
import { PaymentMethodMapper } from '../../shared/mappers/payment-method.mapper';
import { successResponse } from '../../shared/utils/response.util';
import { stripUndefined } from '../../shared/utils/strip-undefined.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type {
  CreatePaymentMethodBody,
  UpdatePaymentMethodBody,
} from '../../shared/validations/payment-method.validation';

export interface PaymentMethodControllerDeps {
  paymentMethodService: PaymentMethodService;
}

export class PaymentMethodController {
  private readonly paymentMethodService: PaymentMethodService;

  constructor(deps: PaymentMethodControllerDeps) {
    this.paymentMethodService = deps.paymentMethodService;
  }

  createPaymentMethod = async (
    req: AuthenticatedRequest<CreatePaymentMethodBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const pm = await this.paymentMethodService.createPaymentMethod(
        stripUndefined(req.body),
        Number(req.user.sub),
      );
      res.status(201).json(successResponse(PaymentMethodMapper.toResponse(pm)));
    } catch (error) {
      next(error);
    }
  };

  getAllPaymentMethods = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const { data, meta } = await this.paymentMethodService.getAllPaymentMethods(
        search,
        page,
        limit,
      );
      res.status(200).json(
        successResponse(
          data.map((pm) => PaymentMethodMapper.toResponse(pm)),
          meta,
        ),
      );
    } catch (error) {
      next(error);
    }
  };

  getActivePaymentMethods = async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.paymentMethodService.getActivePaymentMethods();
      res.status(200).json(
        successResponse(data.map((pm) => PaymentMethodMapper.toResponse(pm))),
      );
    } catch (error) {
      next(error);
    }
  };

  getPaymentMethodById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const pm = await this.paymentMethodService.getPaymentMethodById(Number(req.params.id));
      res.status(200).json(successResponse(PaymentMethodMapper.toResponse(pm)));
    } catch (error) {
      next(error);
    }
  };

  updatePaymentMethod = async (
    req: AuthenticatedRequest<UpdatePaymentMethodBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const pm = await this.paymentMethodService.updatePaymentMethod(
        Number(req.params.id),
        stripUndefined(req.body),
        Number(req.user.sub),
      );
      res.status(200).json(successResponse(PaymentMethodMapper.toResponse(pm)));
    } catch (error) {
      next(error);
    }
  };

  removePaymentMethod = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.paymentMethodService.removePaymentMethod(
        Number(req.params.id),
        Number(req.user.sub),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
