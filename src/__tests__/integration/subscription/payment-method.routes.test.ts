import request from 'supertest';
import express from 'express';
import { createPaymentMethodRouter } from '../../../subscription/routes/payment-method.routes';
import { PaymentMethodController } from '../../../subscription/controllers/payment-method.controller';

const mockPaymentMethodService = {
  getAllPaymentMethods: jest.fn(),
  getActivePaymentMethods: jest.fn(),
  getPaymentMethodById: jest.fn(),
  createPaymentMethod: jest.fn(),
  updatePaymentMethod: jest.fn(),
  removePaymentMethod: jest.fn(),
};

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new PaymentMethodController({
  paymentMethodService: mockPaymentMethodService as any,
});
app.use(
  '/api/v1/subscription/payment-methods',
  createPaymentMethodRouter(controller, mockAuthenticate),
);
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Subscription Payment Method API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'SUPERADMIN' };
  });

  describe('GET /active', () => {
    it('should allow ADMIN to read active payment methods', async () => {
      mockUser = { sub: 1, role: 'ADMIN' };
      mockPaymentMethodService.getActivePaymentMethods.mockResolvedValue([{ id: 1, name: 'VA' }]);

      const res = await request(app)
        .get('/api/v1/subscription/payment-methods/active')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 403 for an OWNER role', async () => {
      mockUser = { sub: 1, role: 'OWNER' };
      const res = await request(app)
        .get('/api/v1/subscription/payment-methods/active')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });

  describe('GET / (list, SUPERADMIN only)', () => {
    it('should list all payment methods for a SUPERADMIN', async () => {
      mockPaymentMethodService.getAllPaymentMethods.mockResolvedValue({
        data: [{ id: 1, name: 'VA' }],
        meta: { total: 1, page: 1, limit: 10 },
      });

      const res = await request(app)
        .get('/api/v1/subscription/payment-methods')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 403 for an ADMIN role on the SUPERADMIN-only list', async () => {
      mockUser = { sub: 1, role: 'ADMIN' };
      const res = await request(app)
        .get('/api/v1/subscription/payment-methods')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/subscription/payment-methods');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /', () => {
    it('should create a payment method for a SUPERADMIN', async () => {
      mockPaymentMethodService.createPaymentMethod.mockResolvedValue({ id: 2, name: 'VA' });

      const res = await request(app)
        .post('/api/v1/subscription/payment-methods')
        .set('Authorization', 'Bearer t')
        .send({ name: 'Virtual Account', fee_type: 'FIXED', fee_value: 4000 });

      expect(res.status).toBe(201);
      expect(mockPaymentMethodService.createPaymentMethod).toHaveBeenCalled();
    });

    it('should return 400 on invalid payload', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/payment-methods')
        .set('Authorization', 'Bearer t')
        .send({ name: 'V' });

      expect(res.status).toBe(400);
    });
  });
});
