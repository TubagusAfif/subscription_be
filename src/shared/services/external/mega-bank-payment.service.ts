import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../config/logger';

// =========================
// API Request & Response Interfaces
// Based on Bank Mega SNAP IPG Swagger
// =========================

export interface MegaBankInquiryRequest {
  amount: number;
  currency: string;
  referenceUrl: string;
  order: {
    id: string;
  };
  customer: {
    name: string;
    email: string;
    phoneNumber: string;
    country?: string;
    postalCode?: string;
  };
  paymentSourceMethod?: string;
  paymentSource: string;
}

export interface MegaBankInquiryResponse {
  id: string;
  createdTime: string;
  referenceId: string;
  status: string;
  amount: number;
  currency: string;
  paymentSources: string[];
  paymentSourceMethod: string;
  urls: {
    selections: string;
    checkout: string;
  };
  accountRef: string;
  responseCode: string;
  responseDesc: string;
}

export interface MegaBankStatusResponseItem {
  id: string;
  createdTime: string;
  updatedTime: string;
  currency: string;
  amount: number;
  type: string;
  paymentSource: string;
  status: string;
  statusCode: string;
  statusData: {
    authenticationModule: string;
    challengeAuthenticationCode?: string;
    processingCode?: string;
    authenticationCode?: string;
    cardType: string;
    cardNetwork?: string;
    message: string;
  };
}

// =========================
// Webhook Payload Interfaces
// =========================

export interface MegaBankWebhookTransaction {
  id: string;
  createdTime: string;
  updatedTime: string;
  currency: string;
  amount: number;
  inquiryId: string;
  merchantId: string;
  type: string;
  paymentSource: string;
  status: string;
  statusCode: string;
  statusData: {
    authenticationModule: string;
    challengeAuthenticationCode?: string;
    processingCode?: string;
    authenticationCode?: string;
    cardType: string;
    cardNetwork?: string;
    message: string;
  };
  networkRefId: string;
}

export interface MegaBankWebhookInquiry {
  id: string;
  createdTime: string;
  updatedTime: string;
  merchantId: string;
  currency: string;
  amount: number;
  lockedAmount: number;
  status: string;
  order: {
    id: string;
    disablePromo?: boolean;
  };
  customer: {
    name: string;
    email: string;
    phoneNumber: string;
    country: string;
    postalCode: string;
    alloPoint?: number;
    alloBalance?: number;
    alloCreditLimit?: number;
  };
  merchant: {
    id: string;
    name: string;
    status: string;
    partnerId?: string | null;
  };
}

export interface MegaBankWebhookPayload {
  type: string;
  transaction: MegaBankWebhookTransaction;
  inquiry: MegaBankWebhookInquiry;
}

// =========================
// Internal Types
// =========================

type HttpMethod = 'GET' | 'POST';

interface ErrorContext {
  code: string;
  message: string;
}

// =========================
// Service Implementation
// =========================

export class MegaBankPaymentService {
  private readonly baseUrl: string;
  private readonly partnerId: string;
  private readonly channelId: string;
  private readonly privateKey: string;
  private readonly clientSecret: string;
  private readonly clientId: string;
  private readonly host: string;

  constructor() {
    this.baseUrl = env.MPG_BASE_URL;
    this.partnerId = env.MPG_PARTNER_ID;
    this.channelId = env.MPG_CHANNEL_ID;
    this.privateKey = env.MPG_SECRET_KEY;
    this.clientSecret = env.MPG_CLIENT_SECRET;
    this.clientId = env.MPG_CLIENT_ID;
    this.host = new URL(env.MPG_BASE_URL).host;
  }

  // --------------------------------------------------------------------------
  // Helper: Formatting & Signature
  // --------------------------------------------------------------------------

  private formatTimestamp(): string {
    return new Date().toISOString().replace('Z', '+07:00').replace(/\.\d{3}/, '');
  }

  private generateExternalId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}${random}`.substring(0, 36);
  }

  private generateRequestSignature(
    httpMethod: HttpMethod,
    path: string,
    accessToken: string,
    body: object | string,
    timestamp: string
  ): string {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex').toLowerCase();

    const stringToSign = `${httpMethod}:${path}:${accessToken}:${bodyHash}:${timestamp}`;

    return crypto
      .createHmac('sha512', this.clientSecret)
      .update(stringToSign)
      .digest('base64');
  }

  // --------------------------------------------------------------------------
  // Helper: Request Execution
  private async sendRequest<T>(
    method: HttpMethod,
    path: string,
    payload: object | null,
    errorContext: ErrorContext
  ): Promise<T> {
    const accessToken = this.clientSecret;
    const timestamp = this.formatTimestamp();
    const externalId = this.generateExternalId();

    const signature = this.generateRequestSignature(
      method, path, accessToken, payload ?? '{}', timestamp
    );

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'X-PARTNER-ID': this.partnerId,
      'X-EXTERNAL-ID': externalId,
      'CHANNEL-ID': this.channelId,
      'Host': this.host,
    };

    if (payload) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });

    logger.info(`[MegaBankPaymentService] respnse ${JSON.stringify(response)}`);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`[MegaBankPaymentService] ${errorContext.message}`, { status: response.status, body: errorBody });
      throw new AppError(errorContext.code, `${errorContext.message}: ${errorBody}`, 502);
    }

    return (await response.json()) as T;
  }

  // --------------------------------------------------------------------------
  // API: Create Payment Inquiry
  // Path: /openapi/v1.0/ipg/inquiries
  // --------------------------------------------------------------------------

  public async createInquiry(payload: MegaBankInquiryRequest): Promise<MegaBankInquiryResponse> {
    return this.sendRequest<MegaBankInquiryResponse>(
      'POST',
      '/openapi/v1.0/ipg/inquiries',
      payload,
      { code: 'MEGA_BANK_INQUIRY_ERROR', message: 'Payment inquiry failed' }
    );
  }

  // --------------------------------------------------------------------------
  // API: Check Payment Status
  // Path: /openapi/v1.0/ipg/transaction/{responseId}/status
  // --------------------------------------------------------------------------

  public async getPaymentStatus(responseId: string): Promise<MegaBankStatusResponseItem[]> {
    return this.sendRequest<MegaBankStatusResponseItem[]>(
      'GET',
      `/openapi/v1.0/ipg/transaction/${responseId}/status`,
      null,
      { code: 'MEGA_BANK_STATUS_ERROR', message: 'Payment status check failed' }
    );
  }

  // --------------------------------------------------------------------------
  // Webhook Signature Verification
  // --------------------------------------------------------------------------

  /**
   * Verifies the incoming webhook signature from Bank Mega.
   * Algorithm: HMAC-SHA256(raw body + timestamp, secretKey)
   *
   * The Signature header format: "{signature};{timestamp}"
   */
  public verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    try {
      const parts = signatureHeader.split(';');
      if (parts.length < 2) {
        logger.warn('[MegaBankPaymentService] Invalid signature header format', { signatureHeader });
        return false;
      }

      const receivedSignature = parts[0]!;
      const timestamp = parts[1]!;

      const expectedSignature = crypto
        .createHmac('sha512', this.clientSecret)
        .update(rawBody + timestamp)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );

      if (!isValid) {
        logger.warn('[MegaBankPaymentService] Webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      logger.error('[MegaBankPaymentService] Webhook signature verification error', { error });
      return false;
    }
  }

  /**
   * Generates the validateSignature response for the webhook.
   * Algorithm: MD5(secretKey + signature + timestamp)
   */
  public generateValidateSignature(signatureHeader: string): string {
    const parts = signatureHeader.split(';');
    const signature = parts[0] || '';
    const timestamp = parts[1] || '';

    return crypto
      .createHash('md5')
      .update(this.clientSecret + signature + timestamp)
      .digest('hex');
  }

  // --------------------------------------------------------------------------
  // Payment Status Helpers
  // --------------------------------------------------------------------------

  /**
   * Checks if the transaction status indicates a successful payment.
   * Success: status "captured" or "authorized" with statusCode "00"
   */
  public isPaymentSuccess(status: string, statusCode: string): boolean {
    return ['captured', 'authorized'].includes(status) && statusCode === '00';
  }

  /**
   * Checks if the transaction status indicates a failed payment.
   */
  public isPaymentFailure(status: string): boolean {
    return ['declined', 'failed'].includes(status);
  }

  /**
   * Checks if the inquiry status indicates a paid inquiry.
   */
  public isInquiryPaid(status: string): boolean {
    return status === 'paid';
  }
}
