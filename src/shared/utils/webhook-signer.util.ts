import crypto from 'crypto';

export const signWebhookPayload = (rawBody: string, secret: string): string => {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
};
