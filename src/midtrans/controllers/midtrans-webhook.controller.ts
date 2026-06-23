import { Request, Response, NextFunction } from 'express';
import { MidtransWebhookProcessorService } from '../services/midtrans-webhook-processor.service';
import { MidtransPaymentService } from '../services/midtrans-payment.service';
import { MidtransNotification } from '../types/midtrans.types';
import { AppError } from '../../shared/middlewares/error.middleware';
import { logger } from '../../shared/config/logger';

export interface MidtransWebhookControllerDeps {
  midtransWebhookProcessorService: MidtransWebhookProcessorService;
  midtransPaymentService: MidtransPaymentService;
}

/**
 * Controller handling Midtrans HTTP payment notifications.
 *
 * Security:
 *  - The signature_key in the body is verified (SHA512 over
 *    order_id+status_code+gross_amount+ServerKey) BEFORE any state mutation.
 *  - Raw body is parsed via captureRawBody so an empty/invalid body is rejected.
 */
export class MidtransWebhookController {
  private readonly processor: MidtransWebhookProcessorService;
  private readonly midtransPaymentService: MidtransPaymentService;

  constructor(deps: MidtransWebhookControllerDeps) {
    this.processor = deps.midtransWebhookProcessorService;
    this.midtransPaymentService = deps.midtransPaymentService;
  }

  /**
   * Handles POST /api/v1/midtrans/webhook/notification
   */
  handleNotification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const notification = req.body as MidtransNotification;

      if (!notification || !notification.order_id || !notification.signature_key) {
        logger.warn('[MidtransWebhookController] Malformed notification', { ip: req.ip });
        throw new AppError('INVALID_NOTIFICATION', 'Malformed Midtrans notification.', 400);
      }

      logger.info('[MidtransWebhookController] Received Midtrans Notification', {
        orderId: notification.order_id,
        transactionId: notification.transaction_id,
        transactionStatus: notification.transaction_status,
      });

      // ── Verify signature BEFORE any state mutation ──
      if (!this.midtransPaymentService.verifyWebhookSignature(notification)) {
        logger.warn('[MidtransWebhookController] Signature verification failed', {
          ip: req.ip,
          orderId: notification.order_id,
        });
        throw new AppError('INVALID_SIGNATURE', 'Invalid Midtrans notification signature.', 403);
      }

      await this.processor.processWebhook(notification);

      res.status(200).json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  };
}
