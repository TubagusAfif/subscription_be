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
 * To remove: delete this file and remove the import in config/routes/index.ts.
 */
export const createDevSimulateRouter = (
  webhookProcessorService: WebhookProcessorService,
): Router => {
  const router = Router();

  /**
   * GET /api/config/dev/simulate?order_id=XXX
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Open+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* ── Stripe-style checkout layout · Bank Mega design tokens (bankmega.com) ──
       brand gold #f4b01c · gold-light #fec930 · orange #f17030
       navy #004b8d / #00385a · body #212529 · surface #f8f9fa
       success #28a745 · danger #dc3545 · fonts: Open Sans + Cinzel */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8f9fa; color: #212529; min-height: 100vh;
      font-weight: 600;
    }
    /* Two-panel Stripe Checkout shell */
    .checkout { display: flex; min-height: 100vh; }
    .checkout__col { flex: 1; display: flex; justify-content: center; }

    /* ── Left: order summary panel (branded) ── */
    .summary {
      background: linear-gradient(160deg, #004b8d 0%, #00385a 100%);
      color: #fff;
    }
    .summary__inner { width: 100%; max-width: 400px; padding: 48px 40px; }
    .back {
      display: inline-flex; align-items: center; gap: 8px;
      color: rgba(255,255,255,.85); text-decoration: none;
      font-size: 14px; font-weight: 700; margin-bottom: 40px;
    }
    .back:hover { color: #fff; }
    .merchant {
      display: flex; align-items: center; gap: 10px;
      font-size: 16px; font-weight: 800; margin-bottom: 28px;
    }
    .merchant__logo {
      width: 28px; height: 28px; border-radius: .25rem;
      background: #f4b01c; color: #00385a; font-family: 'Cinzel', serif;
      font-weight: 900; display: grid; place-items: center; font-size: 15px;
    }
    .summary__label { color: rgba(255,255,255,.8); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
    .summary__amount {
      font-family: 'Cinzel', serif; font-size: 34px; font-weight: 900;
      letter-spacing: .5px; margin-bottom: 28px;
    }
    .line-item {
      display: flex; justify-content: space-between; gap: 16px;
      padding: 14px 0; border-top: 1px solid rgba(255,255,255,.15);
      font-size: 14px; font-weight: 700;
    }
    .line-item:last-of-type { border-bottom: 1px solid rgba(255,255,255,.15); }
    .line-item span:first-child { color: rgba(255,255,255,.7); font-weight: 600; }
    .line-item .mono {
      font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
      font-size: 12px; word-break: break-all; text-align: right; max-width: 60%;
    }
    .badge {
      display: inline-block; background: #f17030; color: #fff;
      font-size: 11px; font-weight: 700; padding: 4px 10px;
      border-radius: .25rem; margin-top: 32px; letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* ── Right: payment form panel ── */
    .pay { background: #fff; }
    .pay__inner { width: 100%; max-width: 400px; padding: 48px 40px; }
    .pay__title {
      font-family: 'Cinzel', serif; font-size: 20px; font-weight: 800; color: #00385a;
      margin-bottom: 24px;
    }
    .field { margin-bottom: 16px; }
    .field > label {
      display: block; font-size: 13px; font-weight: 700;
      color: #495057; margin-bottom: 6px;
    }
    .input, .card-box {
      width: 100%; border: 1px solid #dee2e6; border-radius: .25rem;
      background: #fff; font-family: inherit; font-size: 14px; font-weight: 600; color: #212529;
      transition: border-color .15s, box-shadow .15s;
    }
    .input { padding: 11px 12px; }
    .input:focus, .card-box:focus-within {
      outline: none; border-color: #f4b01c;
      box-shadow: 0 0 0 .2rem rgba(244,176,28,.25);
    }
    /* Combined card field (number / expiry / cvc) — Stripe Element style */
    .card-box { overflow: hidden; }
    .card-box .row { display: flex; }
    .card-box .cell { padding: 11px 12px; border: none; outline: none; font: inherit; font-weight: 700; color: #212529; background: transparent; }
    .card-box .num { width: 100%; border-bottom: 1px solid #dee2e6; }
    .card-box .exp { flex: 1; border-right: 1px solid #dee2e6; }
    .card-box .cvc { flex: 1; }
    .brands { display: flex; gap: 4px; align-items: center; padding-right: 10px; }
    .brand { width: 26px; height: 17px; border-radius: 3px; display: grid; place-items: center; font-size: 8px; font-weight: 700; color: #fff; }
    .brand.visa { background: #1a1f71; }
    .brand.mc { background: #eb001b; }
    .brand.amex { background: #006fcf; }

    /* Pay + secondary action */
    .btn-success {
      width: 100%; margin-top: 8px; padding: 14px; border: none;
      border-radius: .25rem; background: #f4b01c; color: #fff;
      font-family: inherit; font-size: 15px; font-weight: 800;
      letter-spacing: .3px; cursor: pointer;
      box-shadow: 0 2px 5px 0 rgba(0,0,0,.16), 0 2px 10px 0 rgba(0,0,0,.12);
      transition: transform .1s, box-shadow .15s, opacity .15s;
    }
    .btn-success:hover { box-shadow: 0 8px 17px 0 rgba(0,0,0,.2), 0 6px 20px 0 rgba(0,0,0,.19); }
    .btn-success:active { transform: scale(.99); }
    .btn-fail {
      width: 100%; margin-top: 12px; padding: 10px; border: none;
      border-radius: .25rem; background: transparent; color: #dc3545;
      font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .btn-fail:hover { text-decoration: underline; }
    button:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }

    #result {
      margin-top: 18px; padding: 12px; border-radius: .25rem;
      font-size: 13px; font-weight: 700; display: none; text-align: center;
    }
    .result-ok { background: #e6f4ea; color: #1b5e20; border: 1px solid #28a745; }
    .result-err { background: #fbe9e7; color: #b71c1c; border: 1px solid #dc3545; }

    .powered {
      margin-top: 28px; text-align: center; font-size: 12px; color: #a0a0a0;
    }
    .powered a { color: #6c757d; text-decoration: none; }
    .powered a:hover { text-decoration: underline; }

    /* Stack to single column on mobile (Stripe behaviour) */
    @media (max-width: 800px) {
      .checkout { flex-direction: column; }
      .summary__inner, .pay__inner { padding: 32px 24px; max-width: 480px; }
    }
  </style>
</head>
<body>
  <div class="checkout">
    <!-- Left panel: order summary -->
    <section class="checkout__col summary">
      <div class="summary__inner">
        <a href="#" class="back" onclick="return false;">&larr; Back</a>
        <div class="merchant"><span class="merchant__logo">M</span> Bank Mega</div>
        <p class="summary__label">Complete your payment</p>
        <p class="summary__amount">Rp&nbsp;—</p>
        <div class="line-item"><span>Order ID</span><span class="mono">${orderId}</span></div>
        <div class="line-item"><span>Currency</span><span>IDR</span></div>
        <div class="line-item"><span>Method</span><span>Bank Mega Checkout</span></div>
        <span class="badge">⚠ Mock Mode — Dev Only</span>
      </div>
    </section>

    <!-- Right panel: payment form -->
    <section class="checkout__col pay">
      <div class="pay__inner">
        <h2 class="pay__title">Pay with card</h2>

        <div class="field">
          <label>Email</label>
          <input class="input" type="email" value="mock@mock.com" readonly>
        </div>

        <div class="field">
          <label>Card information</label>
          <div class="card-box">
            <div class="row">
              <input class="cell num" value="4242 4242 4242 4242" readonly>
              <div class="brands">
                <span class="brand visa">VISA</span>
                <span class="brand mc">MC</span>
                <span class="brand amex">AMEX</span>
              </div>
            </div>
            <div class="row">
              <input class="cell exp" value="12 / 30" readonly>
              <input class="cell cvc" value="123" readonly>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Name on card</label>
          <input class="input" type="text" value="Mock Customer" readonly>
        </div>

        <div class="field">
          <label>Country</label>
          <input class="input" type="text" value="Indonesia" readonly>
        </div>

        <button class="btn-success" onclick="simulate('success')">Pay now</button>
        <button class="btn-fail" onclick="simulate('failed')">Simulate failed payment</button>

        <div id="result"></div>

        <p class="powered">Mock gateway · <a href="#" onclick="return false;">Terms</a> · <a href="#" onclick="return false;">Privacy</a></p>
      </div>
    </section>
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
   * POST /api/config/dev/simulate-webhook
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
