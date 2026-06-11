import { Response, NextFunction } from 'express';
import { CoinOrderService } from '../services/coin-order.service';
import { AccountService } from '../../shared/services/account.service'
import { CoinOrderMapper } from '../mappers/coin-order.mapper';
import { MegaBankPaymentService } from '../../megabank/services/mega-bank-payment.service';
import { TaxService} from '../../shared/services/tax.service';
import { successResponse } from '../../shared/utils/response.util';
import { AppError } from '../../shared/middlewares/error.middleware';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type {
  CreateBundleCoinOrderBody,
  CreateCoinOrderBody,
} from '../../shared/validations/coin-order.validation';
import { logger } from '../../shared/config/logger';


export interface CoinOrderControllerDeps {
  coinOrderService: CoinOrderService;
  accountService: AccountService;
  megaBankPaymentService: MegaBankPaymentService;
  taxService: TaxService;
}

export class CoinOrderController {
  private readonly coinOrderService: CoinOrderService;
  private readonly megaBankPaymentService: MegaBankPaymentService;
  private readonly accountService: AccountService;
  private readonly taxService: TaxService;

  constructor(deps: CoinOrderControllerDeps) {
    this.coinOrderService = deps.coinOrderService;
    this.megaBankPaymentService = deps.megaBankPaymentService;
    this.accountService = deps.accountService;
    this.taxService = deps.taxService;
  }

  createCoinOrder = async (req: AuthenticatedRequest<CreateCoinOrderBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { coin_amount, payment_source, nominal } = req.body;
      const userId = Number(req.user.sub);

      const activeTax = await this.taxService.getActiveTax();

      const taxRate = activeTax ? Number(activeTax.rate_percent) : 0;

      const { pgOrderId, referenceUrl, totalPrice, taxAmount, activeCurrency } =
        await this.coinOrderService.prepareCustomOrder(userId, coin_amount, taxRate);

      if (nominal !== totalPrice) {
        throw new AppError('INVALID_NOMINAL', 'Nominal does not match the total price.', 400);
      }

      const userData = await this.accountService.getAccount(userId);

      const inquiryResult = await this.megaBankPaymentService.createInquiry({
        amount: totalPrice,
        currency: 'IDR',
        referenceUrl,
        order: { id: pgOrderId },
        customer: {
          name: userData.name,
          email: userData.email,
          phoneNumber: '085640555866',
        },
        paymentSource: payment_source || 'va',
      });

      const result = await this.coinOrderService.saveCustomOrder(
        userId,
        coin_amount,
        activeCurrency.id,
        totalPrice,
        taxAmount,
        pgOrderId,
        inquiryResult.id,
        inquiryResult.urls.checkout
      );

      res.status(201).json(
        successResponse({
          ...CoinOrderMapper.toResponse(result.order),
          checkout_url: inquiryResult.urls.checkout,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  createBundleOrder = async (req: AuthenticatedRequest<CreateBundleCoinOrderBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bundle_id, payment_source, nominal } = req.body;
      const userId = Number(req.user.sub);

      const { bundle, totalPrice, taxAmount, pgOrderId, referenceUrl } = 
        await this.coinOrderService.prepareBundleOrder(userId, bundle_id);
      
      if(nominal !== totalPrice) {
        logger.error(`Nominal : ${nominal} is different with total price : ${totalPrice}`);
        throw new AppError('INVALID_NOMINAL', 'Nominal does not match the total price.', 400);
      }

      const userData = await this.accountService.getAccount(Number(req.user.sub));

      const inquiryResult = await this.megaBankPaymentService.createInquiry({
        amount: totalPrice,
        currency: 'IDR',
        referenceUrl,
        order: { id: pgOrderId },
        customer: {
          name: userData.name,
          email: userData.email,
          phoneNumber: '085640555866',
        },
        paymentSource: payment_source || 'va',
      });

      const result = await this.coinOrderService.saveOrder(
        Number(req.user.sub),
        bundle_id,
        bundle,
        totalPrice,
        taxAmount,
        pgOrderId,
        inquiryResult.id,
        inquiryResult.urls.checkout
      );

      res.status(201).json(
        successResponse({
          ...CoinOrderMapper.toResponse(result.order),
          checkout_url: inquiryResult.urls.checkout,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  getMyOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await this.coinOrderService.getUserOrders(Number(req.user.sub));
      res.status(200).json(
        successResponse(orders.map((o) => CoinOrderMapper.toResponse(o))),
      );
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.coinOrderService.getOrderById(Number(req.params.id), Number(req.user.sub));
      res.status(200).json(
        successResponse(CoinOrderMapper.toResponse(order)),
      );
    } catch (error) {
      next(error);
    }
  };
}
