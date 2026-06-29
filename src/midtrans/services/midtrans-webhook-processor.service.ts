import { CoinOrderService } from '../../client/services/coin-order.service';
import { MidtransPaymentService } from './midtrans-payment.service';
import { MidtransNotification } from '../types/midtrans.types';
import { logger } from '../../shared/config/logger';

export interface MidtransWebhookProcessorServiceDeps {
  coinOrderService: CoinOrderService;
  midtransPaymentService: MidtransPaymentService;
}

/**
 * Processes a verified Midtrans notification, mapping its status onto the
 * shared coin-order success/failure handlers. The order_id field equals our
 * CoinOrder.pg_order_id, and gross_amount is passed through for the existing
 * amount-integrity check in handlePaymentSuccess.
 */
export class MidtransWebhookProcessorService {
  private readonly coinOrderService: CoinOrderService;
  private readonly midtransPaymentService: MidtransPaymentService;

  constructor(deps: MidtransWebhookProcessorServiceDeps) {
    this.coinOrderService = deps.coinOrderService;
    this.midtransPaymentService = deps.midtransPaymentService;
  }

  public async processWebhook(notification: MidtransNotification): Promise<void> {
    const orderId = notification.order_id;

    if (!orderId) {
      logger.warn('[MidtransWebhookProcessorService] notification missing order_id', {
        transactionId: notification.transaction_id,
      });
      return; // Safe to ignore and acknowledge
    }

    const paidAmount = Number(notification.gross_amount);

    if (this.midtransPaymentService.isPaymentSuccess(notification)) {
      await this.coinOrderService.handlePaymentSuccess(
        orderId,
        paidAmount,
        notification.payment_type,
      );
      logger.info('[MidtransWebhookProcessorService] Payment success processed', { orderId });
    } else if (this.midtransPaymentService.isPaymentFailure(notification)) {
      await this.coinOrderService.handlePaymentFailure(orderId);
      logger.info('[MidtransWebhookProcessorService] Payment failure processed', { orderId });
    } else {
      logger.info(
        '[MidtransWebhookProcessorService] Non-terminal status received, no action taken',
        {
          orderId,
          status: notification.transaction_status,
        },
      );
    }
  }
}
