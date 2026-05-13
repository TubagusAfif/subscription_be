import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';
import { logger } from '../config/logger';

// --------------------------------------------------------------------------
// Mega Payment Gateway (MPG) API integration
// --------------------------------------------------------------------------

// ========================= Interfaces =========================

export interface MpgInquiryParams {
  amount: number;
  currency: string;
  referenceUrl: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phoneNumber: string;
    country?: string;
    postalCode?: string;
  };
  paymentSource: 'va' | 'qris';
  paymentSourceMethod?: string;
}

export interface MpgInquiryResult {
  id: string;
  checkoutUrl: string;
  selectionUrl: string;
  accountRef: string;
  status: string;
  responseCode: string;
  responseDesc: string;
}

export interface MpgPaymentStatusResult {
  id: string;
  status: string;
  statusCode: string;
  amount: number;
  currency: string;
  type: string;
  paymentSource: string;
  statusData: {
    message: string;
    authenticationModule: string;
    challengeAuthenticationCode?: string;
    processingCode?: string;
    authenticationCode?: string;
    cardType: string;
    cardNetwork?: string;
  };
}

export interface MpgWebhookTransaction {
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

export interface MpgWebhookInquiry {
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

export interface MpgWebhookPayload {
  type: string;
  transaction: MpgWebhookTransaction;
  inquiry: MpgWebhookInquiry;
}

// ========================= Cached Token =========================

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

/** 
---------------------------------------------------------------
  Service wrapping Mega Payment Gateway (MPG) API for payment
  transactions including inquiries, status checks, and webhook
  verification.
---------------------------------------------------------------
**/
export class MpgService {
  private readonly baseUrl: string;
  private readonly partnerId: string;
  private readonly channelId: string;
  private readonly secretKey: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  private cachedToken: CachedToken | null = null;

  constructor() {
    this.baseUrl = env.MPG_BASE_URL;
    this.partnerId = env.MPG_PARTNER_ID;
    this.channelId = env.MPG_CHANNEL_ID;
    this.secretKey = env.MPG_SECRET_KEY;
    this.clientId = env.MPG_CLIENT_ID;
    this.clientSecret = env.MPG_CLIENT_SECRET;
  }

  // ===========================================================================
  // OAuth 2.0 Access Token
  // ===========================================================================

  /** 
  ---------------------------------------------------------------
    Acquires an OAuth 2.0 access token from MPG. Caches the token
    in memory and auto-refreshes when expired.
  ---------------------------------------------------------------
  **/
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) {
      return this.cachedToken.accessToken;
    }

    const timestamp = this.formatTimestamp();
    const stringToSign = `${this.clientId}|${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('base64');

    const response = await fetch(`${this.baseUrl}/openapi/v1.0/access-token/b2b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TIMESTAMP': timestamp,
        'X-CLIENT-KEY': this.clientId,
        'X-SIGNATURE': signature,
      },
      body: JSON.stringify({
        grantType: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('[MpgService] Failed to obtain access token', { status: response.status, body: errorBody });
      throw new AppError('MPG_AUTH_ERROR', `Failed to obtain MPG access token: ${errorBody}`, 502);
    }

    const data = (await response.json()) as {
      accessToken: string;
      tokenType: string;
      expiresIn: number; // seconds
    };

    this.cachedToken = {
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };

    logger.info('[MpgService] Access token obtained successfully', { expiresIn: data.expiresIn });

    return data.accessToken;
  }

  // ===========================================================================
  // Signature Generation
  // ===========================================================================

  /** 
  ---------------------------------------------------------------
    Generates the X-SIGNATURE header for API requests.
    Algorithm: HMAC-SHA256(clientSecret, stringToSign)
    stringToSign = HTTP_METHOD + ":" + PATH + ":" + ACCESS_TOKEN + ":" +
                   lowercase(hex(SHA-256(minified request body))) + ":" + TIMESTAMP
  ---------------------------------------------------------------
  **/
  generateRequestSignature(
    httpMethod: string,
    path: string,
    accessToken: string,
    body: object | string,
    timestamp: string,
  ): string {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex').toLowerCase();

    const stringToSign = `${httpMethod.toUpperCase()}:${path}:${accessToken}:${bodyHash}:${timestamp}`;

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('base64');
  }

  // ===========================================================================
  // External ID Generation
  // ===========================================================================

  /** 
  ---------------------------------------------------------------
    Generates a unique external ID (max 36 chars, unique per day).
  ---------------------------------------------------------------
  **/
  generateExternalId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}${random}`.substring(0, 36);
  }

  // ===========================================================================
  // 1. Create Payment Inquiry
  // ===========================================================================

  /** 
  ---------------------------------------------------------------
    Creates a payment inquiry on MPG.
    Returns the checkout URL for the customer to complete payment.
  ---------------------------------------------------------------
  **/
  async createInquiry(params: MpgInquiryParams): Promise<MpgInquiryResult> {
    const accessToken = await this.getAccessToken();
    const timestamp = this.formatTimestamp();
    const externalId = this.generateExternalId();
    const path = '/openapi/v1.0/ipg/inquiries';

    const payload = {
      amount: params.amount,
      currency: params.currency,
      referenceUrl: params.referenceUrl,
      order: {
        id: params.orderId,
      },
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        phoneNumber: params.customer.phoneNumber,
        country: params.customer.country || 'ID',
        postalCode: params.customer.postalCode || '',
      },
      paymentSourceMethod: params.paymentSourceMethod || '',
      paymentSource: params.paymentSource,
    };

    const signature = this.generateRequestSignature('POST', path, accessToken, payload, timestamp);

    logger.info('[MpgService] Creating inquiry', { orderId: params.orderId, amount: params.amount, paymentSource: params.paymentSource });

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': this.partnerId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': this.channelId,
        'Host': new URL(this.baseUrl).host,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json() as Record<string, unknown>;

    if (!response.ok || (responseBody.responseCode && responseBody.responseCode !== '0')) {
      logger.error('[MpgService] Inquiry creation failed', { 
        status: response.status, 
        responseCode: responseBody.responseCode,
        responseDesc: responseBody.responseDesc,
      });
      throw new AppError(
        'MPG_INQUIRY_ERROR',
        `Failed to create MPG inquiry: ${responseBody.responseDesc || JSON.stringify(responseBody)}`,
        502,
      );
    }

    const data = responseBody as {
      id: string;
      urls: { selections: string; checkout: string };
      accountRef: string;
      status: string;
      responseCode: string;
      responseDesc: string;
    };

    logger.info('[MpgService] Inquiry created successfully', { id: data.id, status: data.status });

    return {
      id: data.id,
      checkoutUrl: data.urls.checkout,
      selectionUrl: data.urls.selections,
      accountRef: data.accountRef,
      status: data.status,
      responseCode: data.responseCode,
      responseDesc: data.responseDesc,
    };
  }

  // ===========================================================================
  // 2. Get Payment Status
  // ===========================================================================

  /** 
  ---------------------------------------------------------------
    Checks the payment status of a transaction by its response ID.
  ---------------------------------------------------------------
  **/
  async getPaymentStatus(responseId: string): Promise<MpgPaymentStatusResult[]> {
    const accessToken = await this.getAccessToken();
    const timestamp = this.formatTimestamp();
    const externalId = this.generateExternalId();
    const path = `/openapi/v1.0/ipg/transaction/${responseId}/status`;

    // For GET requests, the body is empty "{}"
    const signature = this.generateRequestSignature('GET', path, accessToken, '{}', timestamp);

    logger.info('[MpgService] Checking payment status', { responseId });

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': this.partnerId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': this.channelId,
        'Host': new URL(this.baseUrl).host,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('[MpgService] Payment status check failed', { status: response.status, body: errorBody });
      throw new AppError('MPG_STATUS_ERROR', `Failed to check MPG payment status: ${errorBody}`, 502);
    }

    const data = (await response.json()) as MpgPaymentStatusResult[];

    logger.info('[MpgService] Payment status retrieved', { 
      responseId, 
      status: data[0]?.status, 
      statusCode: data[0]?.statusCode,
    });

    return data;
  }

  // ===========================================================================
  // 3. Webhook Signature Verification
  // ===========================================================================

  /** 
  ---------------------------------------------------------------
    Verifies the incoming webhook signature from MPG.
    Algorithm: HMAC-SHA256(raw body + timestamp, secretKey)
    
    The Signature header format: "{signature};{timestamp}"
  ---------------------------------------------------------------
  **/
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    try {
      const parts = signatureHeader.split(';');
      if (parts.length < 2) {
        logger.warn('[MpgService] Invalid signature header format', { signatureHeader });
        return false;
      }

      const receivedSignature = parts[0]!;
      const timestamp = parts[1]!;

      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(rawBody + timestamp)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );

      if (!isValid) {
        logger.warn('[MpgService] Webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      logger.error('[MpgService] Webhook signature verification error', { error });
      return false;
    }
  }

  /** 
  ---------------------------------------------------------------
    Generates the validateSignature response for the webhook.
    Algorithm: MD5(secretKey + signature + timestamp)
  ---------------------------------------------------------------
  **/
  generateValidateSignature(signatureHeader: string): string {
    const parts = signatureHeader.split(';');
    const signature = parts[0] || '';
    const timestamp = parts[1] || '';

    return crypto
      .createHash('md5')
      .update(this.secretKey + signature + timestamp)
      .digest('hex');
  }

  // ===========================================================================
  // Payment Status Helpers
  // ===========================================================================

  /** 
  ---------------------------------------------------------------
    Checks if the transaction status indicates a successful payment.
    MPG success: status "captured" or "authorized" with statusCode "00"
  ---------------------------------------------------------------
  **/
  isPaymentSuccess(status: string, statusCode: string): boolean {
    return ['captured', 'authorized'].includes(status) && statusCode === '00';
  }

  /** 
  ---------------------------------------------------------------
    Checks if the transaction status indicates a failed payment.
  ---------------------------------------------------------------
  **/
  isPaymentFailure(status: string): boolean {
    return ['declined', 'failed'].includes(status);
  }

  /** 
  ---------------------------------------------------------------
    Checks if the inquiry status indicates a paid inquiry.
  ---------------------------------------------------------------
  **/
  isInquiryPaid(status: string): boolean {
    return status === 'paid';
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  /** 
  ---------------------------------------------------------------
    Formats the current timestamp in ISO 8601 format with timezone.
    Format: yyyy-MM-ddTHH:mm:ss+07:00
  ---------------------------------------------------------------
  **/
  private formatTimestamp(): string {
    return new Date().toISOString().replace('Z', '+07:00').replace(/\.\d{3}/, '');
  }
}
