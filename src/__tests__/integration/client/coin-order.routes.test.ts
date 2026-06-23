import request from 'supertest';
import express from 'express';
import { createCoinOrderRouter } from '../../../client/routes/coin-order.routes';
import { CoinOrderController } from '../../../client/controllers/coin-order.controller';
import { CoinOrderService } from '../../../client/services/coin-order.service';

const mockCoinOrderService = {
  prepareBundleOrder: jest.fn(),
  saveOrder: jest.fn(),
  prepareCustomOrder: jest.fn(),
  saveCustomOrder: jest.fn(),
  getUserOrders: jest.fn(),
  getOrderById: jest.fn(),
  handlePaymentSuccess: jest.fn(),
  handlePaymentFailure: jest.fn(),
  updateOrderPaymentInfo: jest.fn(),
} as unknown as jest.Mocked<CoinOrderService>;

let mockUser: { sub: number; role: string; email?: string; name?: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) {
    return next({ statusCode: 401, message: 'Missing token' });
  }
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());

const mockAccountService = { getAccount: jest.fn() };
const mockTaxService = { getActiveTax: jest.fn() };
const mockPaymentGateway = { name: 'MEGABANK', createCheckout: jest.fn() };

const coinOrderController = new CoinOrderController({
  coinOrderService: mockCoinOrderService,
  accountService: mockAccountService,
  taxService: mockTaxService,
  paymentGateway: mockPaymentGateway,
} as any);
const coinOrderRouter = createCoinOrderRouter(coinOrderController, mockAuthenticate);

app.use('/api/v1/client/coin-orders', coinOrderRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Coin Order API Routes', () => {
  const ownerToken = 'owner-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'OWNER', email: 'owner@test.com', name: 'Owner' };
  });

  describe('POST /api/v1/client/coin-orders/bundle', () => {
    it('should create a bundle order successfully when authenticated as OWNER', async () => {
      mockCoinOrderService.prepareBundleOrder.mockResolvedValue({
        bundle: { id: 1, coin_amount: 100, currency_id: 1 },
        basePrice: 89000,
        taxAmount: 11000,
        gatewayFee: 0,
        totalPrice: 100000,
        paymentMethod: { id: 1, name: 'VA', bank_mega_code: 'va', midtrans_code: 'va' },
        pgOrderId: 'COIN-1-123',
        referenceUrl: 'https://reference'
      } as any);

      mockAccountService.getAccount.mockResolvedValue({
        name: 'User 1',
        email: 'user1@example.com'
      });

      mockPaymentGateway.createCheckout.mockResolvedValue({
        pgResponseId: 'inq-123',
        checkoutUrl: 'https://pgcheckoutdev.bankmega.com/test123',
      } as any);

      mockCoinOrderService.saveOrder.mockResolvedValue({
        order: { id: 1 } as any,
      });

      const response = await request(app)
        .post('/api/v1/client/coin-orders/bundle')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ bundle_id: 1, nominal: 100000, payment_method_id: 1 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.checkout_url).toContain('https://pgcheckoutdev.bankmega.com');
      expect(mockCoinOrderService.saveOrder).toHaveBeenCalled();
    });

    it('should return 401 if missing auth token', async () => {
      const response = await request(app).post('/api/v1/client/coin-orders/bundle').send({ bundle_id: 1, nominal: 100000, payment_source: 'va' });

      expect(response.status).toBe(401);
      expect(mockCoinOrderService.saveOrder).not.toHaveBeenCalled();
    });

    it('should return 400 if validation fails (missing nominal)', async () => {
      const response = await request(app)
        .post('/api/v1/client/coin-orders/bundle')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ bundle_id: 1 });

      expect(response.status).toBe(400);
      expect(mockCoinOrderService.saveOrder).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/client/coin-orders', () => {
    it('should return order history for current user', async () => {
      mockCoinOrderService.getUserOrders.mockResolvedValue([{ id: 10, status: 'PAID' }] as any[]);

      const response = await request(app)
        .get('/api/v1/client/coin-orders')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(mockCoinOrderService.getUserOrders).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/v1/client/coin-orders/:id', () => {
    it('should return specific order details', async () => {
      mockCoinOrderService.getOrderById.mockResolvedValue({ id: 10, status: 'PENDING' } as any);

      const response = await request(app)
        .get('/api/v1/client/coin-orders/10')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(10);
      expect(mockCoinOrderService.getOrderById).toHaveBeenCalledWith(10, 1);
    });
  });
});
