import { Request, Response, NextFunction } from 'express';
import { CoinOrderService } from '../../client/services/coin-order.service';
import { MegaBankPaymentService, MegaBankWebhookPayload } from '../../shared/services/external/mega-bank-payment.service';
import { AppError } from '../../shared/middlewares/error.middleware';
import { logger } from '../../shared/config/logger';
import { env } from '../../shared/config/env';

export interface WebhookControllerDeps {
  coinOrderService: CoinOrderService;
  megaBankPaymentService: MegaBankPaymentService;
}

/** 
---------------------------------------------------------------
  Controller handling Bank Mega Payment Gateway webhook
  notifications and redirect bridge.
---------------------------------------------------------------
**/
export class WebhookController {
  private readonly coinOrderService: CoinOrderService;
  private readonly megaBankPaymentService: MegaBankPaymentService;

  constructor(deps: WebhookControllerDeps) {
    this.coinOrderService = deps.coinOrderService;
    this.megaBankPaymentService = deps.megaBankPaymentService;
  }

  /** 
  ---------------------------------------------------------------
    Handles POST /api/megabank/webhook/mpg
    Receives payment.received webhook from Bank Mega, verifies the
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
      const notification = req.body as MegaBankWebhookPayload;

      logger.info('[WebhookController] Received Bank Mega Notification', {
        type: notification.type,
        transactionId: notification.transaction?.id,
        inquiryOrderId: notification.inquiry?.order?.id,
        transactionStatus: notification.transaction?.status,
      });

      // Verify webhook signature
      if (signatureHeader && !this.megaBankPaymentService.verifyWebhookSignature(rawBody, signatureHeader)) {
        throw new AppError('INVALID_SIGNATURE', 'Invalid Bank Mega webhook signature.', 403);
      }

      // Extract the order reference from the inquiry
      const orderId = notification.inquiry?.order?.id;
      if (!orderId) {
        logger.warn('[WebhookController] Bank Mega notification missing order ID');
        res.status(200).json({ status: 'ok' });
        return;
      }

      const transactionStatus = notification.transaction?.status;
      const statusCode = notification.transaction?.statusCode;

      // Process payment based on transaction status
      if (this.megaBankPaymentService.isPaymentSuccess(transactionStatus, statusCode)) {
        await this.coinOrderService.handlePaymentSuccess(orderId);
        logger.info('[WebhookController] Payment success processed', { orderId });
      } else if (this.megaBankPaymentService.isPaymentFailure(transactionStatus)) {
        await this.coinOrderService.handlePaymentFailure(orderId);
        logger.info('[WebhookController] Payment failure processed', { orderId });
      }
      // For other statuses (pending, submitted, processing), we do nothing

      // Generate validateSignature response
      const validateSignature = signatureHeader
        ? this.megaBankPaymentService.generateValidateSignature(signatureHeader)
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
    Handles GET /api/megabank/webhook/redirect
    Bridge endpoint for Bank Mega checkout callbacks.
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

      logger.info('[WebhookController] Received Bank Mega Redirect', { order_id, status });

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
