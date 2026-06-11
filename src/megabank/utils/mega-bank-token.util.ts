import { env } from '../../shared/config/env';
import { logger } from '../../shared/config/logger';
import { AppError } from '../../shared/middlewares/error.middleware';
import { fetchWithTimeout } from '../../shared/utils/http.util';
import { AccessTokenResponse, CachedToken } from '../types/internal.types';
import { MegaBankSignerUtil } from './mega-bank-signer.util';

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_TOKEN_TTL_SECONDS = 300;

export class MegaBankTokenUtil {
  private static readonly baseUrl = env.MPG_BASE_URL;
  private static readonly clientId = env.MPG_CLIENT_ID;
  private static readonly host = new URL(env.MPG_BASE_URL).host;

  private static cachedToken: CachedToken | null = null;
  private static tokenAcquisitionPromise: Promise<string> | null = null;

  public static async getAccessToken(): Promise<string> {
    if (
      this.cachedToken &&
      this.cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()
    ) {
      return this.cachedToken.accessToken;
    }

    if (this.tokenAcquisitionPromise) {
      return this.tokenAcquisitionPromise;
    }

    this.tokenAcquisitionPromise = this.fetchAccessToken();

    try {
      return await this.tokenAcquisitionPromise;
    } finally {
      this.tokenAcquisitionPromise = null;
    }
  }

  private static async fetchAccessToken(): Promise<string> {
    const timestamp = MegaBankSignerUtil.formatTimestamp();
    const signature = MegaBankSignerUtil.generateAsymmetricSignature(timestamp);
    const url = `${this.baseUrl}/api/v1.0/access-token/b2b`;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-CLIENT-KEY': this.clientId,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'Host': this.host,
      };
      const body = JSON.stringify({ grantType: 'client_credentials' });

      logger.info('[MegaBankTokenUtil] Capturing External API Request (Token)', {
        logic: 'POST to B2B Token endpoint with grantType=client_credentials',
        url, method: 'POST', headers, body, token: null,
      });

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body,
        timeoutMs: REQUEST_TIMEOUT_MS,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('[MegaBankTokenUtil] Access token request failed', { status: response.status, body: errorBody });
        throw new AppError('MEGA_BANK_AUTH_ERROR', `Access token request failed (HTTP ${response.status}): ${errorBody}`, 502);
      }

      const data = (await response.json()) as AccessTokenResponse;

      if (!data.accessToken) {
        throw new AppError('MEGA_BANK_AUTH_ERROR', `Access token response missing accessToken: ${data.responseMessage}`, 502);
      }

      const expiresInSeconds = parseInt(data.expiresIn, 10);
      if (isNaN(expiresInSeconds) || expiresInSeconds <= 0) {
        logger.warn('[MegaBankTokenUtil] Invalid expiresIn, using default TTL', { raw: data.expiresIn, defaultSeconds: DEFAULT_TOKEN_TTL_SECONDS });
      }
      const safeTtlSeconds = (isNaN(expiresInSeconds) || expiresInSeconds <= 0) ? DEFAULT_TOKEN_TTL_SECONDS : expiresInSeconds;

      const expiresInMs = safeTtlSeconds * 1000;
      this.cachedToken = { accessToken: data.accessToken, expiresAt: Date.now() + expiresInMs };
      logger.info('[MegaBankTokenUtil] Access token acquired', { logic: 'Token received successfully, caching for (expiresIn) seconds', expiresIn: data.expiresIn, accessToken: data.accessToken });
      return this.cachedToken.accessToken;

    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[MegaBankTokenUtil] Access token request error', { error: message });
      throw new AppError('MEGA_BANK_AUTH_ERROR', `Access token request failed: ${message}`, 502);
    }
  }

  public static invalidateTokenCache(): void {
    this.cachedToken = null;
    logger.info('[MegaBankTokenUtil] Token cache invalidated');
  }
}
