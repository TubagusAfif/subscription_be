import request from 'supertest';
import express from 'express';
import { createBundleRouter } from '../../../subscription/routes/bundle.routes';
import { BundleController } from '../../../subscription/controllers/bundle.controller';

const mockBundleService = {
  getAllBundles: jest.fn(),
  getBundleById: jest.fn(),
  createBundle: jest.fn(),
  updateBundle: jest.fn(),
  removeBundle: jest.fn(),
};
const mockCurrencyService = { getCurrencyById: jest.fn() };
const mockTaxService = { getActiveTax: jest.fn() };

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new BundleController({
  bundleService: mockBundleService as any,
  currencyService: mockCurrencyService as any,
  taxService: mockTaxService as any,
});
app.use('/api/v1/subscription/bundles', createBundleRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Subscription Bundle API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'ADMIN' };
  });

  describe('GET /', () => {
    it('should list bundles for an ADMIN', async () => {
      mockBundleService.getAllBundles.mockResolvedValue({
        data: [{ id: 1, bundle_name: '100 Coins' }],
        meta: { total: 1, page: 1, limit: 10 },
      });

      const res = await request(app)
        .get('/api/v1/subscription/bundles')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/subscription/bundles');
      expect(res.status).toBe(401);
    });

    it('should return 403 for an OWNER role', async () => {
      mockUser = { sub: 1, role: 'OWNER' };
      const res = await request(app)
        .get('/api/v1/subscription/bundles')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /', () => {
    it('should create a bundle with a calculated price', async () => {
      mockCurrencyService.getCurrencyById.mockResolvedValue({
        id: 1,
        is_active: true,
        conversion_rate: 1000,
      });
      mockTaxService.getActiveTax.mockResolvedValue({ tax_value: 11 });
      mockBundleService.createBundle.mockResolvedValue({ id: 5, bundle_name: '100 Coins' });

      const res = await request(app)
        .post('/api/v1/subscription/bundles')
        .set('Authorization', 'Bearer t')
        .send({ bundle_name: '100 Coins', coin_amount: 100, currency_id: 1 });

      expect(res.status).toBe(201);
      expect(mockBundleService.createBundle).toHaveBeenCalledWith(
        expect.objectContaining({ price: 100000 }),
        1,
      );
    });

    it('should return 400 on invalid payload', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/bundles')
        .set('Authorization', 'Bearer t')
        .send({ bundle_name: 'x' });

      expect(res.status).toBe(400);
      expect(mockBundleService.createBundle).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:id', () => {
    it('should remove a bundle and return 204', async () => {
      mockBundleService.removeBundle.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/v1/subscription/bundles/9')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(204);
      expect(mockBundleService.removeBundle).toHaveBeenCalledWith(9, 1);
    });
  });
});
