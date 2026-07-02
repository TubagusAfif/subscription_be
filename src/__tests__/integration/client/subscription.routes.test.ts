import request from 'supertest';
import express from 'express';
import { createSubscriptionRouter } from '../../../client/routes/subscription.routes';
import { ClientSubscriptionController } from '../../../client/controllers/subscription.controller';
import { ClientSubscriptionService } from '../../../client/services/subscription.service';

const mockSubscriptionService = {
  subscribe: jest.fn(),
  getMySubscription: jest.fn(),
  getMySubscriptions: jest.fn(),
  cancelSubscription: jest.fn(),
  switchPlan: jest.fn(),
  getMyAddons: jest.fn(),
  getSlotDetails: jest.fn(),
} as unknown as jest.Mocked<ClientSubscriptionService>;

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) {
    return next({ statusCode: 401, message: 'Missing token' });
  }
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());

const subscriptionController = new ClientSubscriptionController({
  subscriptionService: mockSubscriptionService,
} as any);
const subscriptionRouter = createSubscriptionRouter(subscriptionController, mockAuthenticate);

app.use('/api/v1/client/subscriptions', subscriptionRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Client Subscription API Routes', () => {
  const ownerToken = 'owner-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'OWNER' };
  });

  describe('POST /api/v1/client/subscriptions', () => {
    it('should purchase a subscription successfully when authenticated as OWNER', async () => {
      mockSubscriptionService.subscribe.mockResolvedValue({ id: 99, status: 'ACTIVE' } as any);

      const response = await request(app)
        .post('/api/v1/client/subscriptions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sku_id: 2 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(99);
      expect(mockSubscriptionService.subscribe).toHaveBeenCalledWith(1, 2);
    });

    it('should return 401 if missing auth token', async () => {
      const response = await request(app).post('/api/v1/client/subscriptions').send({ sku_id: 2 });

      expect(response.status).toBe(401);
      expect(mockSubscriptionService.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/client/subscriptions', () => {
    it('should return active subscription', async () => {
      mockSubscriptionService.getMySubscription.mockResolvedValue({
        id: 99,
        status: 'ACTIVE',
      } as any);
      mockSubscriptionService.getMyAddons.mockResolvedValue([]);
      mockSubscriptionService.getSlotDetails.mockResolvedValue({});

      const response = await request(app)
        .get('/api/v1/client/subscriptions')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(99);
      expect(mockSubscriptionService.getMySubscription).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/v1/client/subscriptions/all', () => {
    it('should return subscription history', async () => {
      mockSubscriptionService.getMySubscriptions.mockResolvedValue([
        { id: 99 },
        { id: 100 },
      ] as any[]);

      const response = await request(app)
        .get('/api/v1/client/subscriptions/all')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(mockSubscriptionService.getMySubscriptions).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /api/v1/client/subscriptions/:id/switch', () => {
    it('should switch a plan successfully when authenticated', async () => {
      mockSubscriptionService.switchPlan.mockResolvedValue({
        id: 100,
        sku_id: 20,
        status: 'ACTIVE',
      } as any);

      const response = await request(app)
        .post('/api/v1/client/subscriptions/1/switch')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ new_sku_id: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(100);
      expect(mockSubscriptionService.switchPlan).toHaveBeenCalledWith(1, 1, 20);
    });

    it('should return 401 if missing auth token', async () => {
      const response = await request(app)
        .post('/api/v1/client/subscriptions/1/switch')
        .send({ new_sku_id: 20 });

      expect(response.status).toBe(401);
      expect(mockSubscriptionService.switchPlan).not.toHaveBeenCalled();
    });
  });
});
