import {
  formatPrivateKey,
  sha256Hex,
  md5Hex,
  hmacSha512Base64,
  rsaSha256Sign,
  timingSafeBase64Equal,
  randomHex
} from '../../shared/utils/crypto.util';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/config/logger';
import { HttpMethod } from '../types/internal.types';

const EXTERNAL_ID_MAX_LENGTH = 36;
const REPLAY_WINDOW_MS = 5 * 60 * 1_000;

export class MegaBankSignerUtil {
  private static readonly privateKeyPem = formatPrivateKey(env.MPG_SECRET_KEY || '');
  private static readonly clientId = env.MPG_CLIENT_ID;
  private static readonly clientSecret = env.MPG_CLIENT_SECRET;

  public static formatTimestamp(): string {
    const date = new Date();
    const offsetMs = 7 * 60 * 60 * 1000;
    const localDate = new Date(date.getTime() + offsetMs);
    return localDate.toISOString().substring(0, 19) + '+07:00';
  }

  public static generateExternalId(): string {
    const timestamp = Date.now().toString();
    const random = randomHex(8);
    return `${timestamp}${random}`.substring(0, EXTERNAL_ID_MAX_LENGTH);
  }

  public static minifyBody(body: object | string | null | undefined): string {
    if (!body || body === '') return '{}';
    let minified = '';
    if (typeof body === 'string') {
      minified = JSON.stringify(JSON.parse(body));
    } else {
      minified = JSON.stringify(body);
    }
    return minified.replace(/\\/g, '');
  }

  public static generateAsymmetricSignature(timestamp: string): string {
    const stringToSign = `${this.clientId}|${timestamp}`;
    const signature = rsaSha256Sign(stringToSign, this.privateKeyPem);
    
    logger.info('[MegaBankSignerUtil] Asymmetric Signature Generation (Token)', {
      logic: 'rsaSha256Sign(clientId|timestamp, privateKey)',
      pattern: '{clientId}|{timestamp}',
      clientId: this.clientId,
      timestamp,
      stringToSign,
      signature
    });

    return signature;
  }

  public static generateRequestSignature(
    httpMethod: HttpMethod,
    path: string,
    accessToken: string,
    body: object | string | null | undefined,
    timestamp: string,
  ): string {
    const minified = this.minifyBody(body);
    const bodyHash = sha256Hex(minified);
    const stringToSign = `${httpMethod}:${path}:${accessToken}:${bodyHash}:${timestamp}`;

    const signature = hmacSha512Base64(stringToSign, this.clientSecret);

    logger.info('[MegaBankSignerUtil] Symmetric Request Signature - Step 1: Minified Body', {
      logic: 'minifyBody(payload) -> Removes spaces and formatting',
      minifiedBody_ForLogOnly: JSON.parse(minified)
    });

    logger.info('[MegaBankSignerUtil] Symmetric Request Signature - Step 2: Body Hash', {
      logic: 'sha256Hex(minifiedBody) -> Produces 64-character lowercase hex string',
      bodyHashSha256: bodyHash
    });

    logger.info('[MegaBankSignerUtil] Symmetric Request Signature - Step 3: String To Sign', {
      logic: 'Pattern: {HTTPMethod}:{EndpointPathURL}:{AccessToken}:{BodyHash}:{Timestamp}',
      stringToSign: stringToSign
    });

    logger.info('[MegaBankSignerUtil] Symmetric Request Signature - Step 4: Final Signature', {
      logic: 'hmacSha512Base64(stringToSign, clientSecret) -> Final Base64 Encoded Signature',
      finalSignatureBase64: signature,
      timestampUsed: timestamp
    });

    return signature;
  }

  public static verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    try {
      const parts = signatureHeader.split(';');
      if (parts.length < 2) {
        logger.warn('[MegaBankSignerUtil] Invalid signature header format', { partsCount: parts.length });
        return false;
      }

      const receivedSignature = parts[0]!;
      const timestamp = parts[1]!;

      const timestampDate = new Date(timestamp);
      const now = new Date();
      const diffMs = Math.abs(now.getTime() - timestampDate.getTime());

      if (isNaN(timestampDate.getTime()) || diffMs > REPLAY_WINDOW_MS) {
        logger.warn('[MegaBankSignerUtil] Webhook timestamp outside replay window', {
          diffMs, maxAgeMs: REPLAY_WINDOW_MS,
        });
        return false;
      }

      const expectedSignature = hmacSha512Base64(rawBody + timestamp, this.clientSecret);
      const isValid = timingSafeBase64Equal(receivedSignature, expectedSignature);

      if (!isValid) {
        logger.warn('[MegaBankSignerUtil] Webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[MegaBankSignerUtil] Webhook signature verification error', { error: message });
      return false;
    }
  }

  public static generateValidateSignature(signatureHeader: string): string {
    const parts = signatureHeader.split(';');
    const signature = parts[0] || '';
    const timestamp = parts[1] || '';
    return md5Hex(this.clientSecret + signature + timestamp);
  }
}
