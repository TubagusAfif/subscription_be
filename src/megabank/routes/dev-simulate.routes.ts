import express, { Router, Request, Response } from 'express';
import { WebhookProcessorService } from '../services/webhook-processor.service';
import { MegaBankWebhookPayload } from '../types/webhook.types';
import { logger } from '../../shared/config/logger';
import crypto from 'crypto';
import { env } from '../../shared/config/env';

/**
 * Dev-only routes for simulating Bank Mega payment flow.
 * Only registered when MPG_MOCK_MODE=true.
 *
 * To remove: delete this file and remove the import in megabank/routes/index.ts.
 */
export const createDevSimulateRouter = (
  webhookProcessorService: WebhookProcessorService,
): Router => {
  const router = Router();

  /**
   * GET /api/megabank/dev/simulate?order_id=XXX
   *
   * Renders a simple HTML page with buttons to simulate
   * payment success or failure.
   */
  router.get('/simulate', (req: Request, res: Response) => {
    const orderId = req.query.order_id as string;

    if (!orderId) {
      res.status(400).send('Missing order_id query parameter');
      return;
    }

    // Securely allow iframing only from the origins defined in the env
    const origins = env.ALLOWED_ORIGINS 
      ? env.ALLOWED_ORIGINS.split(',').join(' ') 
      : env.CLIENT_APP_URL; // fallback to the frontend URL if ALLOWED_ORIGINS is empty
      
    res.setHeader('Content-Security-Policy', `frame-ancestors ${origins};`);
    res.removeHeader('X-Frame-Options'); // Modern browsers use CSP frame-ancestors instead

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mock Payment Gateway — Bank Mega (Dev)</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e; color: #eee;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh;
    }
    .card {
      background: #16213e; border-radius: 16px; padding: 40px;
      box-shadow: 0 8px 32px rgba(0,0,0,.4); max-width: 440px; width: 100%;
      text-align: center;
    }
    .badge {
      display: inline-block; background: #ff9800; color: #000;
      font-size: 11px; font-weight: 700; padding: 4px 10px;
      border-radius: 4px; margin-bottom: 16px; letter-spacing: 1px;
    }
    h1 { font-size: 22px; margin-bottom: 8px; }
    .order-id {
      font-family: monospace; background: #0f3460; padding: 8px 14px;
      border-radius: 8px; margin: 16px 0; font-size: 13px;
      word-break: break-all;
    }
    .buttons { display: flex; gap: 12px; margin-top: 24px; }
    button {
      flex: 1; padding: 14px; border: none; border-radius: 10px;
      font-size: 15px; font-weight: 600; cursor: pointer;
      transition: transform .1s, opacity .15s;
    }
    button:active { transform: scale(.96); }
    button:disabled { opacity: .5; cursor: not-allowed; }
    .btn-success { background: #4CAF50; color: #fff; }
    .btn-fail { background: #f44336; color: #fff; }
    #result {
      margin-top: 20px; padding: 12px; border-radius: 8px;
      font-size: 13px; display: none;
    }
    .result-ok { background: #1b5e20; }
    .result-err { background: #b71c1c; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">⚠ MOCK MODE — DEV ONLY</span>
    <h1>Bank Mega Payment Simulator</h1>
    <p style="color:#aaa; font-size: 14px; margin-top:4px;">This page simulates a Bank Mega checkout callback.</p>
    <div class="order-id">Order: <strong>${orderId}</strong></div>
    <div class="buttons">
      <button class="btn-success" onclick="simulate('success')">✅ Pay Success</button>
      <button class="btn-fail" onclick="simulate('failed')">❌ Pay Failed</button>
    </div>
    <div id="result"></div>
  </div>
  <script>
    async function simulate(action) {
      const btns = document.querySelectorAll('button');
      btns.forEach(b => b.disabled = true);
      const el = document.getElementById('result');
      el.style.display = 'block';
      el.className = '';
      el.textContent = 'Processing...';

      try {
        const res = await fetch('${env.API_PREFIX}/megabank/dev/simulate-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: '${orderId}', action }),
        });
        const data = await res.json();
        
        if (res.ok) {
          el.className = 'result-ok';
          el.textContent = '✅ ' + (data.message || 'Webhook processed successfully. Redirecting back to app...');
          
          // Wait 1.5 seconds, then simulate the redirect back to the frontend
          // exactly how Bank Mega would redirect the user back to your app
          setTimeout(() => {
            const status = action === 'success' ? 'paid' : 'failed';
            const statusCode = action === 'success' ? '00' : '05';
            window.location.href = \`${env.API_PREFIX}/megabank/webhook/redirect?order_id=\${encodeURIComponent('${orderId}')}&status=\${status}&status_code=\${statusCode}\`;
          }, 1500);
        } else {
          el.className = 'result-err';
          el.textContent = '❌ ' + (data.message || 'Webhook processing failed');
          btns.forEach(b => b.disabled = false);
        }
      } catch (err) {
        el.className = 'result-err';
        el.textContent = '❌ Network error: ' + err.message;
        btns.forEach(b => b.disabled = false);
      }
    }
  </script>
</body>
</html>`;

    res.type('html').send(html);
  });

  /**
   * POST /api/megabank/dev/simulate-webhook
   *
   * Constructs a fake MegaBankWebhookPayload and feeds it
   * directly into the WebhookProcessorService.
   *
   * Body: { order_id: string, action: 'success' | 'failed' }
   */
  router.post('/simulate-webhook', express.json(), async (req: Request, res: Response) => {
    try {
      const { order_id, action } = req.body || {};

      if (!order_id || !action) {
        res.status(400).json({ message: 'Missing order_id or action' });
        return;
      }

      const now = new Date().toISOString();
      const transactionId = crypto.randomUUID();
      const inquiryId = crypto.randomUUID();

      const isSuccess = action === 'success';

      const mockPayload: MegaBankWebhookPayload = {
        type: 'payment',
        transaction: {
          id: transactionId,
          createdTime: now,
          updatedTime: now,
          currency: 'IDR',
          amount: 0,
          inquiryId,
          merchantId: 'MOCK-MERCHANT',
          type: 'payment',
          paymentSource: 'mock',
          status: isSuccess ? 'authorized' : 'failed',
          statusCode: isSuccess ? '00' : '05',
          statusData: {
            authenticationModule: 'mock',
            cardType: 'mock',
            message: isSuccess ? 'Mock Payment Success' : 'Mock Payment Failed',
          },
          networkRefId: `MOCK-NET-${Date.now()}`,
        },
        inquiry: {
          id: inquiryId,
          createdTime: now,
          updatedTime: now,
          merchantId: 'MOCK-MERCHANT',
          currency: 'IDR',
          amount: 0,
          lockedAmount: 0,
          status: isSuccess ? 'paid' : 'failed',
          order: {
            id: order_id,
          },
          customer: {
            name: 'Mock Customer',
            email: 'mock@mock.com',
            phoneNumber: '000000000',
            country: 'ID',
            postalCode: '00000',
          },
          merchant: {
            id: 'MOCK-MERCHANT',
            name: 'Mock Merchant',
            status: 'active',
          },
        },
      };

      logger.info('[DevSimulate] Processing mock webhook', {
        orderId: order_id,
        action,
        transactionId,
      });

      await webhookProcessorService.processWebhook(mockPayload);

      res.status(200).json({
        message: `Mock ${action} webhook processed for order ${order_id}`,
        transactionId,
      });
    } catch (error: any) {
      logger.error('[DevSimulate] Mock webhook processing failed', {
        error: error?.message || String(error),
      });
      res.status(500).json({
        message: error?.message || 'Mock webhook processing failed',
      });
    }
  });

  return router;
};
