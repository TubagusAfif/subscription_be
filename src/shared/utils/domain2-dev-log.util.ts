import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Dev-only outbound tracking log for Domain 2 webhook deliveries.
 *
 * Appends one JSON object per line (JSONL) to `logs/domain2-outbound.jsonl` so
 * you can inspect EXACTLY what this server sends to Domain 2 — the full payload,
 * the headers (including the HMAC signature), and the response that came back.
 *
 * IMPORTANT: this is a local debugging aid only. It is a NO-OP unless
 * NODE_ENV === 'development'. It never runs in 'staging' or 'production', and it
 * never throws — any filesystem failure is swallowed so it can't disrupt the
 * actual webhook delivery.
 *
 * Tail it with:  tail -f logs/domain2-outbound.jsonl | jq .
 */

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'domain2-outbound.jsonl');

export interface Domain2OutboundLogEntry {
  /** Webhook event type, e.g. 'subscription.created'. */
  event_type: string;
  /** Idempotency key sent in the X-Idempotency-Key header. */
  idempotency_key: string;
  /** 1-based delivery attempt number. */
  attempt: number;
  /** Full target URL the request was POSTed to. */
  url: string;
  method: string;
  /** Outgoing headers (includes the HMAC signature and timestamp). */
  headers: Record<string, string>;
  /** The webhook payload object sent as the request body. */
  body: unknown;
  /** Populated once a response is received. */
  response?: {
    status: number;
    ok: boolean;
    body?: string;
  };
  /** Populated when the request threw (network error / timeout). */
  error?: string;
  /** Round-trip duration in milliseconds, when known. */
  duration_ms?: number;
}

/** True only in local development — never in staging or production. */
const isDevOnly = (): boolean => env.NODE_ENV === 'development';

/**
 * Record a single outbound Domain 2 request/response. No-op outside development.
 */
export const logDomain2Outbound = (entry: Domain2OutboundLogEntry): void => {
  if (!isDevOnly()) return;

  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n';
    fs.appendFileSync(LOG_FILE, line, 'utf-8');
  } catch (err) {
    // Dev logging must never break delivery — log the failure and move on.
    logger.warn('[domain2-dev-log] Failed to write outbound log', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
