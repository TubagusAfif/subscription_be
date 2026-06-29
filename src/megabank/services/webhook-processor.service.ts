import { CoinOrderService } from '../../client/services/coin-order.service';
import { MegaBankPaymentService } from './mega-bank-payment.service';
import { MegaBankWebhookPayload } from '../types/webhook.types';
import { logger } from '../../shared/config/logger';

export interface WebhookProcessorServiceDeps {
  coinOrderService: CoinOrderService;
  megaBankPaymentService: MegaBankPaymentService;
}

export class WebhookProcessorService {
  private readonly coinOrderService: CoinOrderService;
  private readonly megaBankPaymentService: MegaBankPaymentService;

  constructor(deps: WebhookProcessorServiceDeps) {
    this.coinOrderService = deps.coinOrderService;
    this.megaBankPaymentService = deps.megaBankPaymentService;
  }

  /**
   * Processes the validated Bank Mega webhook payload.
   * Isolates business logic (state mutation) from the HTTP transport layer.
   */
  public async processWebhook(notification: MegaBankWebhookPayload): Promise<void> {
    const orderId = notification.inquiry?.order?.id;

    if (!orderId) {
      logger.warn('[WebhookProcessorService] Bank Mega notification missing order ID', {
        type: notification.type,
        transactionId: notification.transaction?.id,
      });
      return; // Safe to ignore and acknowledge
    }

    const transactionStatus = notification.transaction?.status;
    const statusCode = notification.transaction?.statusCode;

    // Amount the gateway reports as actually charged/locked for this order.
    // Passed to handlePaymentSuccess to assert it matches the stored order total.
    const paidAmount = notification.transaction?.amount ?? notification.inquiry?.amount;

    // ── Process payment based on transaction status ──
    if (this.megaBankPaymentService.isPaymentSuccess(transactionStatus, statusCode)) {
      await this.coinOrderService.handlePaymentSuccess(
        orderId,
        paidAmount,
        notification.transaction?.paymentSource,
      );
      logger.info('[WebhookProcessorService] Payment success processed', { orderId });
    } else if (this.megaBankPaymentService.isPaymentFailure(transactionStatus)) {
      await this.coinOrderService.handlePaymentFailure(orderId);
      logger.info('[WebhookProcessorService] Payment failure processed', { orderId });
    } else {
      // For other statuses (pending, submitted, processing), log and acknowledge
      logger.info('[WebhookProcessorService] Non-terminal status received, no action taken', {
        orderId,
        status: transactionStatus,
        statusCode,
      });
    }
  }
}
