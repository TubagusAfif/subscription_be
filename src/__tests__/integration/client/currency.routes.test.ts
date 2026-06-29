import request from 'supertest';
import express from 'express';
import { createClientCurrencyRouter } from '../../../client/routes/currency.routes';
import { SharedCurrencyController } from '../../../shared/controllers/currency.controller';

const mockCurrencyService = { getActiveCurrency: jest.fn() };

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new SharedCurrencyController(mockCurrencyService as any);
app.use('/api/v1/client/currency', createClientCurrencyRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Client Currency API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'OWNER' };
  });

  describe('GET /active', () => {
    it('should return the active currency for an OWNER', async () => {
      mockCurrencyService.getActiveCurrency.mockResolvedValue({
        id: 1,
        currency_code: 'COIN',
        is_active: true,
      });

      const res = await request(app)
        .get('/api/v1/client/currency/active')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
    });

    it('should return null data when there is no active currency', async () => {
      mockCurrencyService.getActiveCurrency.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/client/currency/active')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/client/currency/active');
      expect(res.status).toBe(401);
    });

    it('should return 403 for a non-OWNER role', async () => {
      mockUser = { sub: 1, role: 'ADMIN' };
      const res = await request(app)
        .get('/api/v1/client/currency/active')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });
});
