import request from 'supertest';
import express from 'express';
import { createClientTaxRouter } from '../../../client/routes/tax.routes';
import { SharedTaxController } from '../../../shared/controllers/tax.controller';

const mockTaxService = { getActiveTax: jest.fn() };

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new SharedTaxController({ taxService: mockTaxService as any });
app.use('/api/v1/client/taxes', createClientTaxRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Client Tax API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'OWNER' };
  });

  describe('GET /active', () => {
    it('should return the active tax wrapped under a tax key', async () => {
      mockTaxService.getActiveTax.mockResolvedValue({
        id: 1,
        tax_name: 'PPN',
        tax_value: '11',
        tax_type: 'PERCENTAGE',
        is_active: true,
      });

      const res = await request(app)
        .get('/api/v1/client/taxes/active')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.tax.id).toBe(1);
    });

    it('should return tax: null when none active', async () => {
      mockTaxService.getActiveTax.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/client/taxes/active')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.tax).toBeNull();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/client/taxes/active');
      expect(res.status).toBe(401);
    });
  });
});
