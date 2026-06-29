import request from 'supertest';
import express from 'express';
import { createSubscriptionAuthRouter } from '../../../subscription/routes/auth.routes';
import { SubscriptionAuthController } from '../../../subscription/controllers/auth.controller';

jest.mock('../../../shared/middlewares/rate-limit.middleware', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  globalLimiter: (_req: any, _res: any, next: any) => next(),
}));

const mockAuthService = { login: jest.fn() };
const mockTokenService = { generateTokens: jest.fn() };

const app = express();
app.use(express.json());
const controller = new SubscriptionAuthController({
  subscriptionAuthService: mockAuthService as any,
  tokenService: mockTokenService as any,
});
app.use('/api/v1/subscription/auth', createSubscriptionAuthRouter(controller));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Subscription Auth API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /login', () => {
    it('should log in an admin and set the subscription refresh cookie', async () => {
      mockAuthService.login.mockResolvedValue({ id: 1, email: 'a@b.com', role: 'ADMIN' });
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });

      const res = await request(app)
        .post('/api/v1/subscription/auth/login')
        .send({ email: 'a@b.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(1, 'ADMIN');
      expect(res.headers['set-cookie'][0]).toContain('refreshToken_subscription=refresh-1');
    });

    it('should return 400 when email/password are missing', async () => {
      const res = await request(app).post('/api/v1/subscription/auth/login').send({});
      expect(res.status).toBe(400);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should propagate a 401 from the service', async () => {
      mockAuthService.login.mockRejectedValue({ statusCode: 401, message: 'Invalid credentials' });

      const res = await request(app)
        .post('/api/v1/subscription/auth/login')
        .send({ email: 'a@b.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
    });
  });
});
