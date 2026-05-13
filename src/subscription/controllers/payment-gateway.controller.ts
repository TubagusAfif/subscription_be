import { Response, NextFunction } from 'express';
import { PaymentGatewayService } from '../services/payment-gateway.service';
import { PaymentGatewayMapper } from '../mappers/payment-gateway.mapper';
import { successResponse } from '../../shared/utils/response.util';
import { stripUndefined } from '../../shared/utils/strip-undefined.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type { CreatePaymentGatewayBody, UpdatePaymentGatewayBody } from '../../shared/validations/payment-gateway.validation';

export interface PaymentGatewayControllerDeps {
  gatewayService: PaymentGatewayService;
}

export class PaymentGatewayController {
  private readonly gatewayService: PaymentGatewayService;

  constructor(deps: PaymentGatewayControllerDeps) {
    this.gatewayService = deps.gatewayService;
  }

  createGateway = async (req: AuthenticatedRequest<CreatePaymentGatewayBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gateway = await this.gatewayService.createGateway(stripUndefined(req.body), Number(req.user.sub));
      res.status(201).json(successResponse({ gateway: PaymentGatewayMapper.toResponse(gateway) }));
    } catch (error) {
      next(error);
    }
  };

  getAllGateways = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gateways = await this.gatewayService.getAllGateways();
      res
        .status(200)
        .json(
          successResponse({ gateways: gateways.map((g) => PaymentGatewayMapper.toResponse(g)) }),
        );
    } catch (error) {
      next(error);
    }
  };

  getGatewayById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gateway = await this.gatewayService.getGatewayById(Number(req.params.id));
      res.status(200).json(successResponse({ gateway: PaymentGatewayMapper.toResponse(gateway) }));
    } catch (error) {
      next(error);
    }
  };

  updateGateway = async (req: AuthenticatedRequest<UpdatePaymentGatewayBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gateway = await this.gatewayService.updateGateway(
        Number(req.params.id),
        stripUndefined(req.body),
        Number(req.user.sub),
      );
      res.status(200).json(successResponse({ gateway: PaymentGatewayMapper.toResponse(gateway) }));
    } catch (error) {
      next(error);
    }
  };

  removeGateway = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.gatewayService.removeGateway(Number(req.params.id), Number(req.user.sub));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
