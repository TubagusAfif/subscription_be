import { Request, Response, NextFunction } from 'express';
import { CoinOrderService } from '../services/coin-order.service';
import { AccountService } from '../../shared/services/account.service'
import { CoinOrderMapper } from '../mappers/coin-order.mapper';
import type { PaymentGateway, CheckoutResult } from '../../shared/payment/payment-gateway.interface';
import { TaxService} from '../../shared/services/tax.service';
import { successResponse } from '../../shared/utils/response.util';
import { AppError } from '../../shared/middlewares/error.middleware';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type {
  CreateBundleCoinOrderBody,
  CreateCoinOrderBody,
} from '../../shared/validations/coin-order.validation';
import { logger } from '../../shared/config/logger';
import { env } from '../../shared/config/env';
import type { PaymentMethod } from '@prisma/client';

/**
 * The payment-source code to hand the active gateway. Uses the method's code
 * for whichever gateway PAYMENT_GATEWAY selects, falling back to 'va'.
 */
const gatewayCodeFor = (paymentMethod: PaymentMethod): string =>
  (env.PAYMENT_GATEWAY === 'megabank'
    ? paymentMethod.bank_mega_code
    : paymentMethod.midtrans_code) || 'va';


export interface CoinOrderControllerDeps {
  coinOrderService: CoinOrderService;
  accountService: AccountService;
  paymentGateway: PaymentGateway;
  taxService: TaxService;
}

export class CoinOrderController {
  private readonly coinOrderService: CoinOrderService;
  private readonly paymentGateway: PaymentGateway;
  private readonly accountService: AccountService;
  private readonly taxService: TaxService;

  constructor(deps: CoinOrderControllerDeps) {
    this.coinOrderService = deps.coinOrderService;
    this.paymentGateway = deps.paymentGateway;
    this.accountService = deps.accountService;
    this.taxService = deps.taxService;
  }

  createCoinOrder = async (req: AuthenticatedRequest<CreateCoinOrderBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { coin_amount, payment_method_id, nominal } = req.body;
      const userId = Number(req.user.sub);

      const activeTax = await this.taxService.getActiveTax();

      const { pgOrderId, referenceUrl, basePrice, taxAmount, gatewayFee, totalPrice, activeCurrency, paymentMethod } =
        await this.coinOrderService.prepareCustomOrder(userId, coin_amount, activeTax, payment_method_id);

      if (nominal !== totalPrice) {
        logger.error(`Nominal : ${nominal} is different with total price : ${totalPrice}`);
        throw new AppError('INVALID_NOMINAL', 'Nominal does not match the total price.', 400);
      }

      const userData = await this.accountService.getAccount(userId);

      const result = await this.coinOrderService.saveCustomOrder(
        userId,
        coin_amount,
        activeCurrency.id,
        basePrice,
        taxAmount,
        gatewayFee,
        totalPrice,
        paymentMethod.id,
        pgOrderId
      );

      let checkoutResult: CheckoutResult;
      try {
        checkoutResult = await this.paymentGateway.createCheckout({
          pgOrderId,
          amount: totalPrice,
          currency: 'IDR',
          referenceUrl,
          customer: {
            name: userData.name,
            email: userData.email,
            phoneNumber: userData.phone || '',
          },
          paymentSource: gatewayCodeFor(paymentMethod),
          itemName: `Coin purchase: ${coin_amount} coins`,
        });
      } catch (inquiryError) {
        // The order was already persisted as PENDING; if the checkout fails
        // mark it FAILED so it does not lock the user out of retrying.
        await this.coinOrderService.failOrder(result.order.id);
        throw inquiryError;
      }

      logger.info(`[Checkout Result] : ${JSON.stringify(checkoutResult)}`)

      await this.coinOrderService.updateOrderPaymentInfo(
        result.order.id,
        checkoutResult.pgResponseId,
        checkoutResult.checkoutUrl || "",
        this.paymentGateway.name,
        checkoutResult.snapToken
      );

      res.status(201).json(
        successResponse({
          ...CoinOrderMapper.toResponse(result.order),
          payment_gateway: this.paymentGateway.name,
          checkout_url: checkoutResult.checkoutUrl,
          snap_token: checkoutResult.snapToken ?? null,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  createBundleOrder = async (req: AuthenticatedRequest<CreateBundleCoinOrderBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bundle_id, payment_method_id, nominal } = req.body;
      const userId = Number(req.user.sub);

      const {
        bundle,
        basePrice,
        taxAmount,
        gatewayFee,
        totalPrice,
        paymentMethod,
        pgOrderId,
        referenceUrl,
      } = await this.coinOrderService.prepareBundleOrder(userId, bundle_id, payment_method_id);

      if (nominal !== totalPrice) {
        logger.error(`Nominal : ${nominal} is different with total price : ${totalPrice}`);
        throw new AppError('INVALID_NOMINAL', 'Nominal does not match the total price.', 400);
      }

      const userData = await this.accountService.getAccount(Number(req.user.sub));

      const result = await this.coinOrderService.saveOrder(
        Number(req.user.sub),
        bundle_id,
        bundle,
        basePrice,
        taxAmount,
        gatewayFee,
        totalPrice,
        paymentMethod.id,
        pgOrderId,
      );

      let checkoutResult: CheckoutResult;
      try {
        checkoutResult = await this.paymentGateway.createCheckout({
          pgOrderId,
          amount: totalPrice,
          currency: 'IDR',
          referenceUrl,
          customer: {
            name: userData.name,
            email: userData.email,
            phoneNumber: userData.phone || '',
          },
          paymentSource: gatewayCodeFor(paymentMethod),
          itemName: bundle.bundle_name || 'Coin bundle',
        });
      } catch (inquiryError) {
        // The order was already persisted as PENDING; if the checkout fails
        // mark it FAILED so it does not lock the user out of retrying.
        await this.coinOrderService.failOrder(result.order.id);
        throw inquiryError;
      }

      logger.info(`[Checkout Result]: ${JSON.stringify(checkoutResult)}`);

      await this.coinOrderService.updateOrderPaymentInfo(
        result.order.id,
        checkoutResult.pgResponseId,
        checkoutResult.checkoutUrl || '',
        this.paymentGateway.name,
        checkoutResult.snapToken,
      );

      res.status(201).json(
        successResponse({
          ...CoinOrderMapper.toResponse(result.order),
          payment_gateway: this.paymentGateway.name,
          checkout_url: checkoutResult.checkoutUrl || '',
          snap_token: checkoutResult.snapToken ?? null,
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

  getOrderByPgOrderId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pgOrderId = req.query.order_id as string;
      const order = await this.coinOrderService.getOrderByPgOrderId(pgOrderId);
      res.status(200).json(
        successResponse(CoinOrderMapper.toResponse(order)),
      );
    } catch (error) {
      next(error);
    }
  };
}
