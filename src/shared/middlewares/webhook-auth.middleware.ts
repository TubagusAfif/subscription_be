import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Webhook Authentication Middleware
 * 
 * Middleware for internal API and Webhook endpoints that verifies the incoming requests 
 * using HMAC-SHA256 signature verification. It ensures that the request is legitimately 
 * sent from a trusted party (Domain 1 or Domain 2) by checking:
 * 
 * 1. Required Headers: `X-Webhook-Signature` and `X-Webhook-Timestamp`.
 * 2. Timestamp Drift: Validates that the request timestamp is within a 5-minute window to prevent replay attacks.
 * 3. Signature Verification: Computes HMAC-SHA256 of the raw body using `WEBHOOK_SHARED_SECRET` and compares it with the signature.
 * 4. Body Parsing: Re-parses the raw Buffer string back into `req.body` object.
 * 
 * Note: Must be used with `express.raw({ type: "application/json" })` so `req.body` is available as a Buffer.
 */

export const webhookAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signatureHeader = req.header('x-webhook-signature');
    const timestampHeader = req.header('x-webhook-timestamp');

    if (!signatureHeader || !timestampHeader) {
      return res.status(401).json({
        success: false,
        message: 'Missing required webhook headers',
        data: null,
        error_code: 'UNAUTHORIZED',
      });
    }

    const timestamp = parseInt(timestampHeader, 10);
    if (isNaN(timestamp)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid timestamp format',
        data: null,
        error_code: 'UNAUTHORIZED',
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const drift = Math.abs(now - timestamp);
    if (drift > 300) { // 5 minutes limit
      return res.status(401).json({
        success: false,
        message: 'Webhook timestamp drift exceeded 5 minutes',
        data: null,
        error_code: 'UNAUTHORIZED',
      });
    }

    // `req.body` will be a Buffer because we use `express.raw({ type: "application/json" })`
    // for this endpoint. If it's a GET request, `req.body` might be empty.
    let rawBody = '';
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf-8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Object.keys(req.body || {}).length === 0) {
      rawBody = '';
    } else {
      // If it's an object with keys, it means express.json() was parsed before this,
      // which is against the instructions for webhook routes.
      return res.status(500).json({
        success: false,
        message: 'Internal error: webhook route must use express.raw() middleware',
        data: null,
        error_code: 'INTERNAL_ERROR',
      });
    }

    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', env.WEBHOOK_SHARED_SECRET)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signatureHeader);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
        data: null,
        error_code: 'UNAUTHORIZED',
      });
    }

    // Reconstruct parsed body from raw string.
    if (rawBody.trim()) {
      try {
        req.body = JSON.parse(rawBody);
      } catch (e) {
        return res.status(422).json({
          success: false,
          message: 'Invalid JSON payload',
          data: null,
          error_code: 'UNPROCESSABLE_ENTITY',
        });
      }
    } else {
      req.body = {};
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal error verifying webhook',
      data: null,
      error_code: 'INTERNAL_ERROR',
    });
  }
};
