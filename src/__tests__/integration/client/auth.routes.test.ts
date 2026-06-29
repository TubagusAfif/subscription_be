import request from 'supertest';
import express from 'express';
import { createClientAuthRouter } from '../../../client/routes/auth.routes';
import { ClientAuthController } from '../../../client/controllers/auth.controller';

// Bypass the auth rate limiter so repeated test requests are not 429'd.
jest.mock('../../../shared/middlewares/rate-limit.middleware', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  globalLimiter: (_req: any, _res: any, next: any) => next(),
}));

const mockAuthService = {
  register: jest.fn(),
  activate: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  login: jest.fn(),
  resendActivation: jest.fn(),
};
const mockTokenService = {
  generateTokens: jest.fn(),
};

const app = express();
app.use(express.json());

const controller = new ClientAuthController({
  clientAuthService: mockAuthService as any,
  tokenService: mockTokenService as any,
});
app.use('/api/v1/client/auth', createClientAuthRouter(controller));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Client Auth API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    it('should register a new client and return 201', async () => {
      mockAuthService.register.mockResolvedValue({ id: 1, email: 'a@b.com' });

      const res = await request(app)
        .post('/api/v1/client/auth/register')
        .send({ email: 'a@b.com', password: 'password123', name: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockAuthService.register).toHaveBeenCalled();
    });

    it('should return 400 when the payload is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/client/auth/register')
        .send({ email: 'not-an-email', password: 'short' });

      expect(res.status).toBe(400);
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /login', () => {
    it('should log in an OWNER and set the refresh cookie', async () => {
      mockAuthService.login.mockResolvedValue({ id: 1, email: 'a@b.com', name: 'Alice', role: 'OWNER' });
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });

      const res = await request(app)
        .post('/api/v1/client/auth/login')
        .send({ email: 'a@b.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(1, 'OWNER');
      expect(res.headers['set-cookie'][0]).toContain('refreshToken_client=refresh-1');
    });

    it('should return 403 when a non-OWNER attempts to log in', async () => {
      mockAuthService.login.mockResolvedValue({ id: 2, role: 'ADMIN' });

      const res = await request(app)
        .post('/api/v1/client/auth/login')
        .send({ email: 'a@b.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
    });

    it('should return 400 when email/password are missing', async () => {
      const res = await request(app).post('/api/v1/client/auth/login').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /activate', () => {
    it('should activate an account with a valid token', async () => {
      mockAuthService.activate.mockResolvedValue({ activated: true });

      const res = await request(app)
        .post('/api/v1/client/auth/activate')
        .send({ token: 'activation-token' });

      expect(res.status).toBe(200);
      expect(mockAuthService.activate).toHaveBeenCalledWith('activation-token');
    });

    it('should return 400 when the token is missing', async () => {
      const res = await request(app).post('/api/v1/client/auth/activate').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /forgot-password', () => {
    it('should accept a valid email', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({ sent: true });

      const res = await request(app)
        .post('/api/v1/client/auth/forgot-password')
        .send({ email: 'a@b.com' });

      expect(res.status).toBe(200);
      expect(mockAuthService.forgotPassword).toHaveBeenCalled();
    });
  });

  describe('POST /reset-password', () => {
    it('should reset with a valid token and password', async () => {
      mockAuthService.resetPassword.mockResolvedValue({ reset: true });

      const res = await request(app)
        .post('/api/v1/client/auth/reset-password')
        .send({ token: 'reset-token', password: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(mockAuthService.resetPassword).toHaveBeenCalled();
    });

    it('should return 400 when the new password is too short', async () => {
      const res = await request(app)
        .post('/api/v1/client/auth/reset-password')
        .send({ token: 'reset-token', password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /resend-activation', () => {
    it('should accept a valid email', async () => {
      mockAuthService.resendActivation.mockResolvedValue({ sent: true });

      const res = await request(app)
        .post('/api/v1/client/auth/resend-activation')
        .send({ email: 'a@b.com' });

      expect(res.status).toBe(200);
      expect(mockAuthService.resendActivation).toHaveBeenCalled();
    });
  });
});
