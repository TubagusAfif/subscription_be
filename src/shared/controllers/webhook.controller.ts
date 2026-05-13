import { Request, Response, NextFunction } from 'express';
import { CoinOrderService } from '../../client/services/coin-order.service';
import { MpgService, MpgWebhookPayload } from '../services/mpg.service';
import { AppError } from '../middlewares/error.middleware';
import { logger } from '../config/logger';
import { env } from '../config/env';

export interface WebhookControllerDeps {
  coinOrderService: CoinOrderService;
  mpgService: MpgService;
}

/** 
---------------------------------------------------------------
  Controller handling MPG (Mega Payment Gateway) webhook
  notifications and redirect bridge.
---------------------------------------------------------------
**/
export class WebhookController {
  private readonly coinOrderService: CoinOrderService;
  private readonly mpgService: MpgService;

  constructor(deps: WebhookControllerDeps) {
    this.coinOrderService = deps.coinOrderService;
    this.mpgService = deps.mpgService;
  }

  /** 
  ---------------------------------------------------------------
    Handles POST /api/shared/webhook/mpg
    Receives payment.received webhook from MPG, verifies the
    signature, processes payment status, and responds with
    validateSignature.
  ---------------------------------------------------------------
  **/
  handleMpgNotification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const signatureHeader = req.headers['signature'] as string;
      const rawBody = JSON.stringify(req.body);
      const notification = req.body as MpgWebhookPayload;

      logger.info('[WebhookController] Received MPG Notification', {
        type: notification.type,
        transactionId: notification.transaction?.id,
        inquiryOrderId: notification.inquiry?.order?.id,
        transactionStatus: notification.transaction?.status,
      });

      // Verify webhook signature
      if (signatureHeader && !this.mpgService.verifyWebhookSignature(rawBody, signatureHeader)) {
        throw new AppError('INVALID_SIGNATURE', 'Invalid MPG webhook signature.', 403);
      }

      // Extract the order reference from the inquiry
      const orderId = notification.inquiry?.order?.id;
      if (!orderId) {
        logger.warn('[WebhookController] MPG notification missing order ID');
        res.status(200).json({ status: 'ok' });
        return;
      }

      const transactionStatus = notification.transaction?.status;
      const statusCode = notification.transaction?.statusCode;

      // Process payment based on transaction status
      if (this.mpgService.isPaymentSuccess(transactionStatus, statusCode)) {
        await this.coinOrderService.handlePaymentSuccess(orderId);
        logger.info('[WebhookController] Payment success processed', { orderId });
      } else if (this.mpgService.isPaymentFailure(transactionStatus)) {
        await this.coinOrderService.handlePaymentFailure(orderId);
        logger.info('[WebhookController] Payment failure processed', { orderId });
      }
      // For other statuses (pending, submitted, processing), we do nothing

      // Generate validateSignature response
      const validateSignature = signatureHeader
        ? this.mpgService.generateValidateSignature(signatureHeader)
        : '';

      res.status(200).json({
        status: 'ok',
        validateSignature,
      });
    } catch (error) {
      next(error);
    }
  };

  /** 
  ---------------------------------------------------------------
    Handles GET /api/shared/webhook/redirect
    Bridge endpoint for MPG checkout callbacks.
    Redirects the customer back to the frontend with payment status.
  ---------------------------------------------------------------
  **/
  handleMpgRedirect = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { order_id, status, status_code } = req.query;

      logger.info('[WebhookController] Received MPG Redirect', { order_id, status });

      // Determine destination based on status
      let destination = '/payment/unfinish';

      if (status === 'paid' || status === 'captured' || status === 'authorized') {
        destination = '/payment/finish';
      } else if (typeof status === 'string' && ['declined', 'failed', 'expired'].includes(status)) {
        destination = '/payment/error';
      }

      const frontendUrl = env.CLIENT_APP_URL;
      const redirectUrl = `${frontendUrl}${destination}?order_id=${order_id}&status=${status}&status_code=${status_code}`;

      res.redirect(302, redirectUrl);
    } catch (error) {
      next(error);
    }
  };
}
