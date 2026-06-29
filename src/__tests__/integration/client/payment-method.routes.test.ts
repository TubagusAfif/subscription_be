import request from 'supertest';
import express from 'express';
import { createClientPaymentMethodRouter } from '../../../client/routes/payment-method.routes';
import { SharedPaymentMethodController } from '../../../shared/controllers/payment-method.controller';

const mockPaymentMethodService = { getActivePaymentMethods: jest.fn() };

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new SharedPaymentMethodController({
  paymentMethodService: mockPaymentMethodService as any,
});
app.use(
  '/api/v1/client/payment-methods',
  createClientPaymentMethodRouter(controller, mockAuthenticate),
);
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Client Payment Method API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'OWNER' };
  });

  describe('GET /active', () => {
    it('should return the active payment methods', async () => {
      mockPaymentMethodService.getActivePaymentMethods.mockResolvedValue([
        { id: 1, name: 'VA', midtrans_code: 'va', bank_mega_code: 'va', is_active: true },
      ]);

      const res = await request(app)
        .get('/api/v1/client/payment-methods/active')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      // Shared controller wraps the list alongside the active payment gateway.
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].id).toBe(1);
      expect(res.body.data.payment_gateway).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/client/payment-methods/active');
      expect(res.status).toBe(401);
      expect(mockPaymentMethodService.getActivePaymentMethods).not.toHaveBeenCalled();
    });
  });
});
