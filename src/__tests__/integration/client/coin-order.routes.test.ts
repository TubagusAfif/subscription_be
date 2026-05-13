import request from 'supertest';
import express from 'express';
import { createCoinOrderRouter } from '../../../client/routes/coin-order.routes';
import { CoinOrderController } from '../../../client/controllers/coin-order.controller';
import { CoinOrderService } from '../../../client/services/coin-order.service';

const mockCoinOrderService = {
  createOrder: jest.fn(),
  getUserOrders: jest.fn(),
  getOrderById: jest.fn(),
  handlePaymentSuccess: jest.fn(),
  handlePaymentFailure: jest.fn(),
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

const coinOrderController = new CoinOrderController({
  coinOrderService: mockCoinOrderService,
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

  describe('POST /api/v1/client/coin-orders', () => {
    it('should create an order successfully when authenticated as OWNER', async () => {
      mockCoinOrderService.createOrder.mockResolvedValue({
        checkout_url: 'https://pgcheckoutdev.bankmega.com/test123',
        order: { id: 1 } as any,
      });

      const response = await request(app)
        .post('/api/v1/client/coin-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ bundle_id: 1 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.checkout_url).toContain('https://pgcheckoutdev.bankmega.com');
      expect(mockCoinOrderService.createOrder).toHaveBeenCalledWith(1, 1, {
        id: 1,
        email: 'user1@example.com',
        name: 'User 1',
        phone: '',
      }, 'va');
    });

    it('should return 401 if missing auth token', async () => {
      const response = await request(app).post('/api/v1/client/coin-orders').send({ bundle_id: 1 });

      expect(response.status).toBe(401);
      expect(mockCoinOrderService.createOrder).not.toHaveBeenCalled();
    });

    it('should return 400 if validation fails (missing bundle_id)', async () => {
      const response = await request(app)
        .post('/api/v1/client/coin-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(mockCoinOrderService.createOrder).not.toHaveBeenCalled();
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
