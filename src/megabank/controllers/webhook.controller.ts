import { Request, Response, NextFunction } from 'express';
import { WebhookProcessorService } from '../services/webhook-processor.service';
import { MegaBankPaymentService } from '../services/mega-bank-payment.service';
import { MegaBankWebhookPayload } from '../types/webhook.types';
import { AppError } from '../../shared/middlewares/error.middleware';
import { logger } from '../../shared/config/logger';
import { env } from '../../shared/config/env';

export interface WebhookControllerDeps {
  webhookProcessorService: WebhookProcessorService;
  megaBankPaymentService: MegaBankPaymentService;
}

/**
 * Controller handling Bank Mega Payment Gateway webhook
 * notifications and redirect bridge.
 */
export class WebhookController {
  private readonly webhookProcessorService: WebhookProcessorService;
  private readonly megaBankPaymentService: MegaBankPaymentService;

  constructor(deps: WebhookControllerDeps) {
    this.webhookProcessorService = deps.webhookProcessorService;
    this.megaBankPaymentService = deps.megaBankPaymentService;
  }

  /**
   * Handles POST /api/megabank/webhook/mpg
   *
   * Receives `payment.received` webhook from Bank Mega, verifies the
   * signature, processes payment status, and responds with
   * validateSignature.
   *
   * Security:
   *  - Signature header is REQUIRED — requests without it are rejected.
   *  - Raw body is used for signature verification (not re-serialized JSON).
   *  - Timestamp in signature is validated against replay attacks.
   */
  handleMpgNotification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const signatureHeader = req.headers['signature'] as string | undefined;

      // ── Guard: Signature header is mandatory ──
      if (!signatureHeader) {
        logger.warn('[WebhookController] Bank Mega notification received without Signature header', {
          ip: req.ip,
          path: req.path,
        });
        throw new AppError('MISSING_SIGNATURE', 'Signature header is required.', 401);
      }

      // Use raw body for signature verification to avoid JSON re-serialization issues
      if (typeof req.rawBody !== 'string') {
        logger.error('[WebhookController] rawBody missing. Ensure rawBody middleware is configured.');
        throw new AppError('MISSING_RAW_BODY', 'Webhook raw body is required for signature verification.', 400);
      }
      const rawBody = req.rawBody;
      const notification = req.body as MegaBankWebhookPayload;

      logger.info('[WebhookController] Received Bank Mega Notification', {
        type: notification.type,
        transactionId: notification.transaction?.id,
        inquiryOrderId: notification.inquiry?.order?.id,
        transactionStatus: notification.transaction?.status,
      });

      // ── Grafana Loki Audit Log ──
      logger.info('[AUDIT] Bank Mega Inbound Webhook', {
        labels: { stream: 'payment-audit', type: 'inbound_webhook' },
        rawBody,
        headers: {
          'x-signature': signatureHeader,
          'x-timestamp': req.headers['x-timestamp'],
        },
      });

      // ── Verify webhook signature (includes timestamp/replay check) ──
      if (!this.megaBankPaymentService.verifyWebhookSignature(rawBody, signatureHeader)) {
        logger.warn('[WebhookController] Signature verification failed', {
          ip: req.ip,
          orderId: notification.inquiry?.order?.id,
        });
        throw new AppError('INVALID_SIGNATURE', 'Invalid Bank Mega webhook signature.', 403);
      }

      // ── Delegate to Processor ──
      await this.webhookProcessorService.processWebhook(notification);

      // ── Generate validateSignature response ──
      const validateSignature = this.megaBankPaymentService.generateValidateSignature(signatureHeader);

      res.status(200).json({
        status: 'ok',
        validateSignature,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handles GET /api/megabank/webhook/redirect
   *
   * Bridge endpoint for Bank Mega checkout callbacks.
   * Redirects the customer back to the frontend with payment status.
   */
  handleMpgRedirect = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { order_id, status, status_code } = req.query;

      logger.info('[WebhookController] Received Bank Mega Redirect', { order_id, status });

      // Determine destination based on status
      let destination = '/payment/unfinish';

      if (status === 'paid' || status === 'captured' || status === 'authorized') {
        destination = '/payment/finish';
      } else if (typeof status === 'string' && ['declined', 'failed', 'expired'].includes(status)) {
        destination = '/payment/error';
      }

      const frontendUrl = env.CLIENT_APP_URL;
      const encodedOrderId = encodeURIComponent(String(order_id || ''));
      const encodedStatus = encodeURIComponent(String(status || ''));
      const encodedStatusCode = encodeURIComponent(String(status_code || ''));
      const redirectUrl = `${frontendUrl}${destination}?order_id=${encodedOrderId}&status=${encodedStatus}&status_code=${encodedStatusCode}`;

      res.redirect(302, redirectUrl);
    } catch (error) {
      next(error);
    }
  };
}
