import { env } from '../../shared/config/env';
import { logger } from '../../shared/config/logger';
import { AppError } from '../../shared/middlewares/error.middleware';
import { fetchWithTimeout, withRetry } from '../../shared/utils/http.util';
import { HttpMethod, ErrorContext } from '../types/internal.types';
import { MegaBankSignerUtil } from './mega-bank-signer.util';
import { MegaBankTokenUtil } from './mega-bank-token.util';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 8_000;

export class MegaBankApiError extends AppError {
  constructor(code: string, message: string, public readonly originalStatus: number, details?: unknown) {
    super(code, message, 502, details);
  }
}

export class MegaBankHttpUtil {
  private static readonly baseUrl = env.MPG_BASE_URL;
  private static readonly partnerId = env.MPG_PARTNER_ID;
  private static readonly channelId = env.MPG_CHANNEL_ID;
  private static readonly host = new URL(env.MPG_BASE_URL).host;

  public static async sendRequest<T>(
    method: HttpMethod,
    path: string,
    payload: object | null,
    errorContext: ErrorContext,
  ): Promise<T> {
    return await withRetry(async (attempt) => {
      const accessToken = await MegaBankTokenUtil.getAccessToken();
      const timestamp = MegaBankSignerUtil.formatTimestamp();
      const externalId = MegaBankSignerUtil.generateExternalId();

      const signature = MegaBankSignerUtil.generateRequestSignature(
        method,
        path,
        accessToken,
        payload,
        timestamp,
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

      if (payload) headers['Content-Type'] = 'application/json';

      try {
        const requestUrl = `${this.baseUrl}${path}`;
        const requestBody = payload ? JSON.stringify(payload) : undefined;

        logger.info('[MegaBankHttpUtil] Capturing External API Request', { url: requestUrl, method, headers, body: requestBody, token: accessToken });

        const response = await fetchWithTimeout(requestUrl, { method, headers, ...(requestBody ? { body: requestBody } : {}), timeoutMs: REQUEST_TIMEOUT_MS });

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error('[MegaBankHttpUtil] API request failed', { path, status: response.status, attempt, errorBody, payload });

          let parsedErrorBody: unknown = errorBody;
          try {
            parsedErrorBody = JSON.parse(errorBody);
          } catch {
            // Keep as string if not JSON
          }

          throw new MegaBankApiError(errorContext.code, errorContext.message, response.status, {
            httpStatus: response.status,
            errorBody: parsedErrorBody,
          });
        }

        const responseData = (await response.json()) as T;
        logger.info('[MegaBankHttpUtil] API request completed', { path, status: response.status, attempt, response: responseData });
        return responseData;
      } catch (error) {
        if (error instanceof AppError) throw error;
        logger.error('[MegaBankHttpUtil] Unexpected request error', { path, attempt, error: error instanceof Error ? error.message : String(error) });
        throw new AppError(errorContext.code, errorContext.message, 502, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, {
      maxRetries: MAX_RETRIES,
      baseDelayMs: BASE_DELAY_MS,
      maxDelayMs: MAX_DELAY_MS,
      shouldRetry: (error: unknown) => {
        if (error instanceof MegaBankApiError) {
          if (error.originalStatus >= 400 && error.originalStatus < 500) return false;
        }
        return true;
      },
    });
  }
}
