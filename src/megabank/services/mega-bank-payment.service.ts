import { MegaBankInquiryRequest, MegaBankInquiryResponse } from '../types/inquiry.types';
import { MegaBankHttpUtil, MegaBankApiError } from '../utils/mega-bank-http.util';
import { MegaBankSignerUtil } from '../utils/mega-bank-signer.util';
import { MegaBankTokenUtil } from '../utils/mega-bank-token.util';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/config/logger';
import crypto from 'crypto';

const PAYMENT_SUCCESS_STATUSES = ['captured', 'authorized'] as const;
const PAYMENT_SUCCESS_CODE = '00';
const PAYMENT_FAILURE_STATUSES = ['declined', 'failed'] as const;

export function isPaymentSuccess(status: string, statusCode: string): boolean {
  return (PAYMENT_SUCCESS_STATUSES as readonly string[]).includes(status)
    && statusCode === PAYMENT_SUCCESS_CODE;
}

export function isPaymentFailure(status: string): boolean {
  return (PAYMENT_FAILURE_STATUSES as readonly string[]).includes(status);
}

export function isInquiryPaid(status: string): boolean {
  return status === 'paid';
}

export class MegaBankPaymentService {
  /**
   * Creates a new payment inquiry via the Bank Mega IPG API.
   *
   * When MPG_MOCK_MODE is enabled, returns a dummy response without
   * making any HTTP calls to Bank Mega.
   *
   * @param payload - Inquiry request containing amount, customer, and order details.
   * @returns The inquiry response with payment URLs and reference information.
   * @throws {AppError} `MEGA_BANK_INQUIRY_ERROR` (502) on failure.
   */
  public async createInquiry(payload: MegaBankInquiryRequest): Promise<MegaBankInquiryResponse> {
    // ── Mock Mode: return dummy response instantly ──
    if (env.MPG_MOCK_MODE) {
      logger.warn('[MegaBankPaymentService] MOCK MODE — returning dummy inquiry response', {
        orderId: payload.order.id,
        amount: payload.amount,
      });

      return {
        id: crypto.randomUUID(),
        createdTime: new Date().toISOString(),
        referenceId: payload.order.id,
        status: 'unpaid',
        amount: payload.amount,
        currency: payload.currency,
        paymentSources: [payload.paymentSource],
        paymentSourceMethod: payload.paymentSourceMethod || '',
        urls: {
          selections: `${env.BASE_URL}${env.API_PREFIX}/megabank/dev/simulate?order_id=${payload.order.id}`,
          checkout: `${env.BASE_URL}${env.API_PREFIX}/megabank/dev/simulate?order_id=${payload.order.id}`,
        },
        accountRef: `MOCK-${Date.now()}`,
        responseCode: '0',
        responseDesc: 'Success (Mock)',
      };
    }

    return MegaBankHttpUtil.sendRequest<MegaBankInquiryResponse>(
      'POST',
      '/openapi/v1.0/ipg/inquiries',
      payload,
      { code: 'MEGA_BANK_INQUIRY_ERROR', message: 'Payment inquiry failedd' },
    );
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (env.MPG_MOCK_MODE) return true;
    return MegaBankSignerUtil.verifyWebhookSignature(rawBody, signatureHeader);
  }

  public generateValidateSignature(signatureHeader: string): string {
    if (env.MPG_MOCK_MODE) return 'mock-validate-signature';
    return MegaBankSignerUtil.generateValidateSignature(signatureHeader);
  }

  public isPaymentSuccess(status: string, statusCode: string): boolean {
    return isPaymentSuccess(status, statusCode);
  }

  public isPaymentFailure(status: string): boolean {
    return isPaymentFailure(status);
  }

  public isInquiryPaid(status: string): boolean {
    return isInquiryPaid(status);
  }

  public invalidateTokenCache(): void {
    MegaBankTokenUtil.invalidateTokenCache();
  }
}

export { MegaBankApiError };
