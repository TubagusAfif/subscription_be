import { Router, Request, Response } from 'express';
import ejs from 'ejs';
import path from 'path';

/**
 * Dev-only routes for previewing the EJS email templates in a browser.
 * Renders the real templates from src/shared/mails with sample data — no SMTP
 * is involved, so it is safe to hit repeatedly.
 *
 * Mounted in app.ts only when NODE_ENV !== 'production'.
 *
 * To remove: delete this file and remove its import/mount in app.ts.
 */

// Same resolution MailService uses (this file lives in shared/routes, templates in shared/mails).
const MAILS_DIR = path.join(__dirname, '..', 'mails');

const SAMPLE_USER = { name: 'Andi Wijaya', email: 'andi@example.com' };

interface MailSample {
  label: string;
  template: string;
  subject: string;
  data: Record<string, unknown>;
}

// One entry per previewable email (slug -> sample).
const SAMPLES: Record<string, MailSample> = {
  'client-activation': {
    label: 'Client — Account Activation (link)',
    template: 'client-activation-mail.ejs',
    subject: 'Activate Your Account',
    data: {
      user: SAMPLE_USER,
      activationLink: 'https://app.idental.id/activate?token=sample-activation-token-123',
    },
  },
  'reset-password': {
    label: 'Client — Password Reset',
    template: 'client-reset-password-mail.ejs',
    subject: 'Reset Your Password',
    data: {
      user: SAMPLE_USER,
      resetLink: 'https://app.idental.id/reset-password?token=sample-reset-token-123',
    },
  },
  'activation-code': {
    label: 'Account Activation (code)',
    template: 'activation-mail.ejs',
    subject: 'Activate Your Account',
    data: { user: SAMPLE_USER, activationCode: '839204' },
  },
  'expiry-reminder': {
    label: 'Subscription — Renewal Reminder (7 days)',
    template: 'client-expiry-warning-mail.ejs',
    subject: 'Reminder: Your Pro Plan Subscription Expires in 7 Days',
    data: { user: SAMPLE_USER, skuName: 'Pro Plan', daysBefore: 7 },
  },
  'expiry-reminder-1': {
    label: 'Subscription — Renewal Reminder (1 day)',
    template: 'client-expiry-warning-mail.ejs',
    subject: 'Reminder: Your Pro Plan Subscription Expires in 1 Day',
    data: { user: SAMPLE_USER, skuName: 'Pro Plan', daysBefore: 1 },
  },
  'expiry-today': {
    label: 'Subscription — Expires Today',
    template: 'client-expiry-warning-mail.ejs',
    subject: 'Action Required: Your Pro Plan Subscription Expires Today',
    data: { user: SAMPLE_USER, skuName: 'Pro Plan', daysBefore: 0 },
  },
  'expiry-grace': {
    label: 'Subscription — Grace Period',
    template: 'client-expiry-warning-mail.ejs',
    subject: 'Notice: Your Pro Plan Subscription is in Grace Period',
    data: { user: SAMPLE_USER, skuName: 'Pro Plan', daysBefore: -1 },
  },
  'expiry-ended': {
    label: 'Subscription — Grace Period Ended',
    template: 'client-expiry-warning-mail.ejs',
    subject: 'Alert: Your Pro Plan Subscription Grace Period Ended',
    data: { user: SAMPLE_USER, skuName: 'Pro Plan', daysBefore: -7 },
  },
};

export const createDevMailPreviewRouter = (basePath: string): Router => {
  const router = Router();

  /** Index page listing every previewable email. */
  router.get('/', (_req: Request, res: Response) => {
    const items = Object.entries(SAMPLES)
      .map(
        ([slug, s]) => `
        <li>
          <a href="${basePath}/${slug}">${s.label}</a>
          <span class="subject">${s.subject}</span>
          <code>${s.template}</code>
        </li>`,
      )
      .join('');

    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Template Previews — Idental</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&family=Barlow:wght@900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Public Sans', Helvetica, Arial, sans-serif; background: #F4F6F8; color: #212B36; padding: 48px 16px; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 720px; margin: 0 auto; }
    .brand { font-family: 'Barlow', sans-serif; font-weight: 900; font-size: 26px; letter-spacing: -0.5px; margin-bottom: 4px; }
    .brand span { color: #00AB55; }
    .lead { color: #637381; font-size: 15px; margin-bottom: 32px; }
    ul { list-style: none; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 0 2px 0 rgba(145,158,171,.2), 0 12px 24px -4px rgba(145,158,171,.12); }
    li { padding: 18px 24px; border-bottom: 1px solid #DFE3E8; display: flex; flex-direction: column; gap: 4px; }
    li:last-child { border-bottom: none; }
    li a { font-size: 16px; font-weight: 700; color: #00AB55; text-decoration: none; }
    li a:hover { text-decoration: underline; }
    .subject { font-size: 13px; color: #637381; }
    code { font-size: 12px; color: #919EAB; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="brand">Idental <span>x Artoo Pay</span></div>
    <p class="lead">Email template previews · rendered with sample data (dev only)</p>
    <ul>${items}</ul>
  </div>
</body>
</html>`);
  });

  /** Render a single template with its sample data. */
  router.get('/:slug', async (req: Request, res: Response) => {
    const slug = String(req.params.slug);
    const sample = SAMPLES[slug];
    if (!sample) {
      res.status(404).type('html').send(
        `Unknown preview "<b>${slug}</b>". <a href="${basePath}">Back to list</a>.`,
      );
      return;
    }

    try {
      const html = await ejs.renderFile(path.join(MAILS_DIR, sample.template), sample.data);
      res.type('html').send(html);
    } catch (err) {
      res
        .status(500)
        .type('html')
        .send(`Failed to render <b>${sample.template}</b>: ${(err as Error).message}`);
    }
  });

  return router;
};
