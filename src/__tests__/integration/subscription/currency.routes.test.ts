import request from 'supertest';
import express from 'express';
import { createCurrencyRouter } from '../../../subscription/routes/currency.routes';
import { CurrencyController } from '../../../subscription/controllers/currency.controller';

const mockCurrencyService = {
  getAllCurrencies: jest.fn(),
  getActiveCurrency: jest.fn(),
  getCurrencyById: jest.fn(),
  createCurrency: jest.fn(),
  updateCurrency: jest.fn(),
  removeCurrency: jest.fn(),
  activateCurrency: jest.fn(),
};

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new CurrencyController({ currencyService: mockCurrencyService as any });
app.use('/api/v1/subscription/currencies', createCurrencyRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Subscription Currency API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'SUPERADMIN' };
  });

  describe('GET /', () => {
    it('should list currencies for a SUPERADMIN', async () => {
      mockCurrencyService.getAllCurrencies.mockResolvedValue({
        data: [{ id: 1, currency_code: 'IDR' }],
        meta: { total: 1, page: 1, limit: 10 },
      });

      const res = await request(app)
        .get('/api/v1/subscription/currencies')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/subscription/currencies');
      expect(res.status).toBe(401);
    });

    it('should return 403 for a non-SUPERADMIN role', async () => {
      mockUser = { sub: 1, role: 'ADMIN' };
      const res = await request(app)
        .get('/api/v1/subscription/currencies')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /', () => {
    it('should create a currency', async () => {
      mockCurrencyService.createCurrency.mockResolvedValue({ id: 2, currency_code: 'IDR' });

      const res = await request(app)
        .post('/api/v1/subscription/currencies')
        .set('Authorization', 'Bearer t')
        .send({
          currency_name: 'Rupiah',
          currency_code: 'IDR',
          symbol: 'Rp',
          conversion_rate: 1000,
          effective_from: '2025-01-01',
        });

      expect(res.status).toBe(201);
      expect(mockCurrencyService.createCurrency).toHaveBeenCalled();
    });

    it('should return 400 on invalid payload', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/currencies')
        .set('Authorization', 'Bearer t')
        .send({ currency_name: 'R' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /:id/activate', () => {
    it('should activate a currency', async () => {
      mockCurrencyService.activateCurrency.mockResolvedValue({ id: 3, is_active: true });

      const res = await request(app)
        .patch('/api/v1/subscription/currencies/3/activate')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(mockCurrencyService.activateCurrency).toHaveBeenCalledWith(3, 1);
    });
  });
});
