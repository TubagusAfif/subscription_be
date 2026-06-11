import { MegaBankInquiryRequest, MegaBankInquiryResponse } from '../types/inquiry.types';
import { MegaBankHttpUtil, MegaBankApiError } from '../utils/mega-bank-http.util';
import { MegaBankSignerUtil } from '../utils/mega-bank-signer.util';
import { MegaBankTokenUtil } from '../utils/mega-bank-token.util';

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
   * @param payload - Inquiry request containing amount, customer, and order details.
   * @returns The inquiry response with payment URLs and reference information.
   * @throws {AppError} `MEGA_BANK_INQUIRY_ERROR` (502) on failure.
   */
  public async createInquiry(payload: MegaBankInquiryRequest): Promise<MegaBankInquiryResponse> {
    return MegaBankHttpUtil.sendRequest<MegaBankInquiryResponse>(
      'POST',
      '/openapi/v1.0/ipg/inquiries',
      payload,
      { code: 'MEGA_BANK_INQUIRY_ERROR', message: 'Payment inquiry failedd' },
    );
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    return MegaBankSignerUtil.verifyWebhookSignature(rawBody, signatureHeader);
  }

  public generateValidateSignature(signatureHeader: string): string {
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
