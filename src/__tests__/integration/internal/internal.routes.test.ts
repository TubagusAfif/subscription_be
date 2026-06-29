import request from 'supertest';
import express from 'express';
import { createInternalRouter } from '../../../internal/routes/internal.routes';
import { InternalController } from '../../../internal/controllers/internal.controller';
import { AppError } from '../../../shared/middlewares/error.middleware';

// The real webhook auth performs HMAC verification (covered by its own unit test).
// Here we replace it with a pass-through that parses the raw Buffer into req.body,
// mirroring what the real middleware does after a successful verification.
jest.mock('../../../shared/middlewares/webhook-auth.middleware', () => ({
  webhookAuthMiddleware: (req: any, _res: any, next: any) => {
    if (Buffer.isBuffer(req.body)) {
      req.body = req.body.length ? JSON.parse(req.body.toString('utf8')) : {};
    }
    next();
  },
}));

const mockInternalService = {
  slotAssign: jest.fn(),
  slotRelease: jest.fn(),
  getSubscriptionByCompany: jest.fn(),
  generateRenewalUrl: jest.fn(),
  getQuotaDetails: jest.fn(),
};

const app = express();
const controller = new InternalController(mockInternalService as any);
app.use('/api/internal/v1', createInternalRouter(controller));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Internal API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /slots/assign', () => {
    const payload = {
      external_subscription_id: 'ext-1',
      resource_type: 'CLINIC',
      ref_id: 1,
      ref_type: 'clinic',
      assigned_at: '2025-01-01T00:00:00.000Z',
    };

    it('should assign a slot and return 200', async () => {
      mockInternalService.slotAssign.mockResolvedValue({ slot_id: 5, quota_remaining: 2 });

      const res = await request(app)
        .post('/api/internal/v1/slots/assign')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(payload));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ slot_id: 5, quota_remaining: 2 });
    });

    it('should return 409 with quota details when the quota is exceeded', async () => {
      mockInternalService.slotAssign.mockRejectedValue(
        new AppError('QUOTA_EXCEEDED', 'Quota CLINIC habis.', 409),
      );
      mockInternalService.getQuotaDetails.mockResolvedValue({ total_quota: 3, used_quota: 3 });

      const res = await request(app)
        .post('/api/internal/v1/slots/assign')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(payload));

      expect(res.status).toBe(409);
      expect(res.body.error_code).toBe('QUOTA_EXCEEDED');
      expect(res.body.data).toMatchObject({ max_quota: 3, used_quota: 3 });
    });

    it('should return 404 when the subscription is not found', async () => {
      mockInternalService.slotAssign.mockRejectedValue(
        new AppError('SUBSCRIPTION_NOT_FOUND', 'not found', 404),
      );

      const res = await request(app)
        .post('/api/internal/v1/slots/assign')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(payload));

      expect(res.status).toBe(404);
      expect(res.body.error_code).toBe('SUBSCRIPTION_NOT_FOUND');
    });
  });

  describe('POST /slots/release', () => {
    it('should release a slot and return 200', async () => {
      mockInternalService.slotRelease.mockResolvedValue({ quota_remaining: 3 });

      const res = await request(app)
        .post('/api/internal/v1/slots/release')
        .set('Content-Type', 'application/json')
        .send(
          JSON.stringify({ external_subscription_id: 'ext-1', resource_type: 'CLINIC', ref_id: 1 }),
        );

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ quota_remaining: 3 });
    });
  });

  describe('GET /subscriptions/by-company/:external_subscription_id', () => {
    it('should return the subscription snapshot', async () => {
      mockInternalService.getSubscriptionByCompany.mockResolvedValue({
        event: 'subscription.sync',
        data: { company_id: 42 },
      });

      const res = await request(app).get('/api/internal/v1/subscriptions/by-company/ext-1');

      expect(res.status).toBe(200);
      expect(mockInternalService.getSubscriptionByCompany).toHaveBeenCalledWith('ext-1');
      expect(res.body.data.event).toBe('subscription.sync');
    });
  });

  describe('POST /billing/renewal-url', () => {
    it('should generate a renewal url and return 200', async () => {
      mockInternalService.generateRenewalUrl.mockResolvedValue({
        renewal_url: 'http://localhost:3000/checkout/renewal?token=t',
        expires_at: '2025-01-01T00:30:00.000Z',
      });

      const res = await request(app)
        .post('/api/internal/v1/billing/renewal-url')
        .set('Content-Type', 'application/json')
        .send(
          JSON.stringify({ external_subscription_id: 'ext-1', return_url: 'https://idental.com' }),
        );

      expect(res.status).toBe(200);
      expect(res.body.data.renewal_url).toContain('token=');
    });
  });
});
