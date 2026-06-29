import request from 'supertest';
import express from 'express';
import { createCronRouter } from '../../../cron/routes/cron.routes';
import { CronController } from '../../../cron/controllers/cron.controller';

const mockDailyExpiryService = { runDailyExpirySweep: jest.fn() };

const app = express();
const controller = new CronController(mockDailyExpiryService as any);
app.use('/api/v1/cron', createCronRouter(controller));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

// No CRON_SECRET env set in tests → controller falls back to 'default_cron_secret'.
const SECRET = process.env.CRON_SECRET || 'default_cron_secret';

describe('Cron API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /daily-expiry', () => {
    it('should return 401 without the cron secret', async () => {
      const res = await request(app).post('/api/v1/cron/daily-expiry').send({});
      expect(res.status).toBe(401);
      expect(mockDailyExpiryService.runDailyExpirySweep).not.toHaveBeenCalled();
    });

    it('should run the sweep when authenticated via x-cron-secret', async () => {
      mockDailyExpiryService.runDailyExpirySweep.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/cron/daily-expiry')
        .set('x-cron-secret', SECRET)
        .send({});

      expect(res.status).toBe(200);
      expect(mockDailyExpiryService.runDailyExpirySweep).toHaveBeenCalled();
    });

    it('should run the sweep when authenticated via Bearer token', async () => {
      mockDailyExpiryService.runDailyExpirySweep.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/cron/daily-expiry')
        .set('Authorization', `Bearer ${SECRET}`)
        .send({});

      expect(res.status).toBe(200);
    });

    it('should return 500 when the sweep throws', async () => {
      mockDailyExpiryService.runDailyExpirySweep.mockRejectedValue(new Error('boom'));

      const res = await request(app)
        .post('/api/v1/cron/daily-expiry')
        .set('x-cron-secret', SECRET)
        .send({});

      expect(res.status).toBe(500);
    });
  });
});
