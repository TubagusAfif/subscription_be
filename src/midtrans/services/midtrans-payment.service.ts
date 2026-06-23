import midtransClient, { Snap, SnapTransactionParameters } from 'midtrans-client';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/config/logger';
import { AppError } from '../../shared/middlewares/error.middleware';
import { sha512Hex, timingSafeHexEqual } from '../../shared/utils/crypto.util';
import type {
  PaymentGateway,
  PaymentGatewayName,
  CreateCheckoutParams,
  CheckoutResult,
} from '../../shared/payment/payment-gateway.interface';
import type { MidtransNotification, MidtransSnapParameter } from '../types/midtrans.types';

// transaction_status values that mean the payment settled successfully.
const SUCCESS_STATUSES = ['settlement', 'capture'] as const;
// transaction_status values that mean the payment will never complete.
const FAILURE_STATUSES = ['deny', 'cancel', 'expire', 'failure'] as const;

/**
 * Maps our PaymentMethod.code (see prisma/seed.ts) to the Midtrans Snap
 * `enabled_payments` channels. Passing a single channel makes Snap skip its
 * "choose a payment method" list and open directly on the method the user
 * already picked on our checkout, so they never select twice.
 * See https://docs.midtrans.com/docs/snap-advanced-feature.
 *
 * Any code not listed here falls through to the full Snap menu (safe default —
 * never blocks checkout). Confirm channel strings against the channels actually
 * activated on your Midtrans account before relying on them.
 */
const SNAP_CHANNELS_BY_CODE: Record<string, string[]> = {
  // QRIS in our catalog is coded `megaqris` (shared with the Mega gateway).
  megaqris: ['qris'],
  // A generic "Virtual Account" — each bank is its own channel; the user still
  // picks their bank inside Snap, but every non-VA option is hidden.
  va: ['bca_va', 'bni_va', 'bri_va', 'permata_va', 'echannel', 'other_va'],
  // Defensive: not active today, but mapped so they behave if re-enabled.
  credit_card: ['credit_card'],
  gopay: ['gopay'],
};

/**
 * Midtrans Snap implementation of the PaymentGateway abstraction.
 *
 * - createCheckout() creates a Snap transaction and returns the hosted
 *   redirect URL + token.
 * - verifyWebhookSignature() validates the HTTP notification signature.
 * - isPaymentSuccess / isPaymentFailure classify the notification status.
 */
export class MidtransPaymentService implements PaymentGateway {
  public readonly name: PaymentGatewayName = 'MIDTRANS';

  private _snap: Snap | undefined;

  private get snap(): Snap {
    if (!this._snap) {
      if (!env.MIDTRANS_SERVER_KEY) {
        throw new AppError(
          'MIDTRANS_NOT_CONFIGURED',
          'Midtrans server key is not configured.',
          500,
        );
      }
      this._snap = new midtransClient.Snap({
        isProduction: env.MIDTRANS_IS_PRODUCTION,
        serverKey: env.MIDTRANS_SERVER_KEY,
        clientKey: env.MIDTRANS_CLIENT_KEY,
      });
    }
    return this._snap;
  }

  /**
   * Creates a Snap transaction and returns the hosted checkout details.
   *
   * @throws {AppError} `MIDTRANS_CHECKOUT_ERROR` (502) on failure.
   */
  public async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const parameter: MidtransSnapParameter = {
      transaction_details: {
        order_id: params.pgOrderId,
        gross_amount: Math.round(params.amount),
      },
      customer_details: {
        first_name: params.customer.name,
        email: params.customer.email,
        phone: params.customer.phoneNumber,
      },
      item_details: [
        {
          id: params.pgOrderId,
          price: Math.round(params.amount),
          quantity: 1,
          name: params.itemName || 'Coin purchase',
        },
      ],
      callbacks: {
        finish: `${env.CLIENT_APP_URL}/payment/finish`,
      },
    };

    // Lock Snap to the method the user already chose so it skips its own
    // payment-method list. Unknown codes fall through to the full menu.
    const channels = params.paymentSource
      ? SNAP_CHANNELS_BY_CODE[params.paymentSource.toLowerCase()]
      : undefined;
    if (channels) {
      parameter.enabled_payments = channels;
    }

    try {
      const result = await this.snap.createTransaction(parameter as unknown as SnapTransactionParameters);
      return {
        pgResponseId: result.token,
        checkoutUrl: result.redirect_url,
        snapToken: result.token,
      };
    } catch (error) {
      logger.error('[MidtransPaymentService] createTransaction failed', {
        orderId: params.pgOrderId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('MIDTRANS_CHECKOUT_ERROR', 'Failed to create Midtrans checkout.', 502);
    }
  }

  /**
   * Verifies the Midtrans notification signature:
   *   signature_key = SHA512(order_id + status_code + gross_amount + ServerKey)
   * Compared in constant time.
   */
  public verifyWebhookSignature(notification: MidtransNotification): boolean {
    if (!env.MIDTRANS_SERVER_KEY) return false;
    if (!notification.signature_key) return false;

    const expected = sha512Hex(
      notification.order_id +
        notification.status_code +
        notification.gross_amount +
        env.MIDTRANS_SERVER_KEY,
    );
    return timingSafeHexEqual(expected, notification.signature_key);
  }

  public isPaymentSuccess(notification: MidtransNotification): boolean {
    const status = notification.transaction_status;
    if (status === 'capture') {
      // A captured card payment is only final once fraud review accepts it.
      return notification.fraud_status === 'accept';
    }
    return (SUCCESS_STATUSES as readonly string[]).includes(status);
  }

  public isPaymentFailure(notification: MidtransNotification): boolean {
    return (FAILURE_STATUSES as readonly string[]).includes(notification.transaction_status);
  }
}
