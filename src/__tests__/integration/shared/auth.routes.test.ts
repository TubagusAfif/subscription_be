import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createSharedAuthRouter } from '../../../shared/routes/auth.routes';
import { SharedAuthController } from '../../../shared/controllers/auth.controller';
import { TokenService } from '../../../shared/services/token.service';

// Mock Services
jest.mock('../../../shared/services/token.service');

const mockTokenService = new TokenService({} as any) as jest.Mocked<TokenService>;

// The shared auth router accepts an authenticate handler param (currently unused
// by the routes themselves), so we supply a simple pass-through.
const mockAuthenticate: express.RequestHandler = (_req, _res, next) => next();

const app = express();
app.use(express.json());
app.use(cookieParser());

const authController = new SharedAuthController({ tokenService: mockTokenService });
const authRouter = createSharedAuthRouter(authController, mockAuthenticate);

app.use('/api/v1/auth', authRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Shared Auth API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens and return a new access token (client app)', async () => {
      mockTokenService.rotateRefreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken_client=old-refresh-token'])
        .send({ app: 'client' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBe('new-access-token');
      expect(mockTokenService.rotateRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      // New refresh token should be set as an httpOnly cookie.
      expect(response.headers['set-cookie'][0]).toContain('refreshToken_client=new-refresh-token');
    });

    it('should use subscription cookie name when app=subscription', async () => {
      mockTokenService.rotateRefreshToken.mockResolvedValue({
        accessToken: 'sub-access-token',
        refreshToken: 'sub-refresh-token',
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken_subscription=old-sub-token'])
        .send({ app: 'subscription' });

      expect(response.status).toBe(200);
      expect(mockTokenService.rotateRefreshToken).toHaveBeenCalledWith('old-sub-token');
      expect(response.headers['set-cookie'][0]).toContain(
        'refreshToken_subscription=sub-refresh-token',
      );
    });

    it('should return 401 when no refresh token cookie is present', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ app: 'client' });

      expect(response.status).toBe(401);
      expect(mockTokenService.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('should pass through service errors (e.g. invalid token)', async () => {
      mockTokenService.rotateRefreshToken.mockRejectedValue({
        statusCode: 401,
        message: 'Invalid refresh token',
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken_client=bad-token'])
        .send({ app: 'client' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke the refresh token and clear cookies', async () => {
      mockTokenService.revokeRefreshToken.mockResolvedValue(undefined as any);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', ['refreshToken_client=token-to-revoke'])
        .send({ app: 'client' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith('token-to-revoke');
    });

    it('should still return 200 when there is no refresh token (idempotent)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ app: 'client' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTokenService.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });
});
