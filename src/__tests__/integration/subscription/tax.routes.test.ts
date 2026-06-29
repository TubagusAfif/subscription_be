import request from 'supertest';
import express from 'express';
import { createTaxRouter } from '../../../subscription/routes/tax.routes';
import { TaxController } from '../../../subscription/controllers/tax.controller';
import { SharedTaxController } from '../../../shared/controllers/tax.controller';

const mockTaxService = {
  getAllTaxes: jest.fn(),
  getActiveTax: jest.fn(),
  getTaxById: jest.fn(),
  createTax: jest.fn(),
  updateTax: jest.fn(),
  removeTax: jest.fn(),
  activateTax: jest.fn(),
};

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const taxController = new TaxController({ taxService: mockTaxService as any });
const sharedTaxController = new SharedTaxController({ taxService: mockTaxService as any });
app.use(
  '/api/v1/subscription/taxes',
  createTaxRouter(taxController, sharedTaxController, mockAuthenticate),
);
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Subscription Tax API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'SUPERADMIN' };
  });

  describe('GET /', () => {
    it('should list taxes for a SUPERADMIN', async () => {
      mockTaxService.getAllTaxes.mockResolvedValue({
        data: [{ id: 1, tax_name: 'PPN' }],
        meta: { total: 1, page: 1, limit: 10 },
      });

      const res = await request(app)
        .get('/api/v1/subscription/taxes')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/subscription/taxes');
      expect(res.status).toBe(401);
    });

    it('should return 403 for a non-SUPERADMIN role', async () => {
      mockUser = { sub: 1, role: 'ADMIN' };
      const res = await request(app)
        .get('/api/v1/subscription/taxes')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /active', () => {
    it('should return the active tax (shared controller) wrapped under a tax key', async () => {
      mockTaxService.getActiveTax.mockResolvedValue({ id: 1, tax_name: 'PPN', tax_value: '11' });

      const res = await request(app)
        .get('/api/v1/subscription/taxes/active')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.tax.id).toBe(1);
    });
  });

  describe('POST /', () => {
    it('should create a tax', async () => {
      mockTaxService.createTax.mockResolvedValue({ id: 2, tax_name: 'PPN' });

      const res = await request(app)
        .post('/api/v1/subscription/taxes')
        .set('Authorization', 'Bearer t')
        .send({ tax_name: 'PPN', tax_value: 11, tax_type: 'PERCENTAGE' });

      expect(res.status).toBe(201);
      expect(mockTaxService.createTax).toHaveBeenCalled();
    });

    it('should return 400 on invalid payload', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/taxes')
        .set('Authorization', 'Bearer t')
        .send({ tax_name: 'P' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /:id', () => {
    it('should remove a tax and return 204', async () => {
      mockTaxService.removeTax.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/v1/subscription/taxes/3')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(204);
      expect(mockTaxService.removeTax).toHaveBeenCalledWith(3, 1);
    });
  });
});
