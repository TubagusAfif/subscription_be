import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { TokenService } from '../../../shared/services/token.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

// --------------------------------------------------------------------------
// Mock env and jsonwebtoken
// --------------------------------------------------------------------------
jest.mock('../../../shared/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));
jest.mock('jsonwebtoken');
const mockJwt = jest.mocked(jwt);

// --------------------------------------------------------------------------
// Mock @prisma/client – we only need a partial PrismaClient shape
// --------------------------------------------------------------------------
const mockRefreshTokenCreate = jest.fn();
const mockRefreshTokenFindByTokenHashWithUser = jest.fn();
const mockRefreshTokenUpdate = jest.fn();
const mockRefreshTokenRevokeByTokenHash = jest.fn();

const mockRefreshTokenRepository = {
  create: mockRefreshTokenCreate,
  findByTokenHashWithUser: mockRefreshTokenFindByTokenHashWithUser,
  update: mockRefreshTokenUpdate,
  revokeByTokenHash: mockRefreshTokenRevokeByTokenHash,
} as any;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const MOCK_SECRET = 'test-super-secret-jwt-key-for-unit-tests';
const MOCK_USER_ID = 1;
const MOCK_ROLE: Role = 'OWNER';

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------
describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TokenService(mockRefreshTokenRepository);
  });

  // ── generateAccessToken ─────────────────────────────────────────────────
  describe('generateAccessToken', () => {
    it('should call jwt.sign with correct payload and options', () => {
      (mockJwt.sign as jest.Mock).mockReturnValue('mocked.access.token');

      const token = service.generateAccessToken(MOCK_USER_ID, MOCK_ROLE);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { sub: MOCK_USER_ID, role: MOCK_ROLE },
        expect.any(String),
        { algorithm: 'HS256', expiresIn: '15m' },
      );
      expect(token).toBe('mocked.access.token');
    });
  });

  // ── generateRefreshToken ────────────────────────────────────────────────
  describe('generateRefreshToken', () => {
    it('should return a hex string of 80 characters (40 bytes)', () => {
      const token = service.generateRefreshToken();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(80);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should return a different value on each call', () => {
      const t1 = service.generateRefreshToken();
      const t2 = service.generateRefreshToken();
      expect(t1).not.toBe(t2);
    });
  });

  // ── hashToken ───────────────────────────────────────────────────────────
  describe('hashToken', () => {
    it('should return a deterministic sha256 hex hash', () => {
      const token = 'some-refresh-token';
      const expected = crypto.createHash('sha256').update(token).digest('hex');
      expect(service.hashToken(token)).toBe(expected);
    });

    it('should produce different hashes for different inputs', () => {
      expect(service.hashToken('abc')).not.toBe(service.hashToken('xyz'));
    });
  });

  // ── generateTokens ──────────────────────────────────────────────────────
  describe('generateTokens', () => {
    it('should persist the hashed refresh token and return a token pair', async () => {
      (mockJwt.sign as jest.Mock).mockReturnValue('access-token');
      mockRefreshTokenCreate.mockResolvedValue({});

      const result = await service.generateTokens(MOCK_USER_ID, MOCK_ROLE);

      expect(mockRefreshTokenCreate).toHaveBeenCalledWith({
        user_id: MOCK_USER_ID,
        token_hash: expect.any(String),
        expires_at: expect.any(Date),
      });
      expect(result.accessToken).toBe('access-token');
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  // ── verifyAccessToken ───────────────────────────────────────────────────
  describe('verifyAccessToken', () => {
    it('should return decoded JWTPayload for a valid token', () => {
      const payload = { sub: MOCK_USER_ID, role: MOCK_ROLE, iat: 1000, exp: 9999 };
      (mockJwt.verify as jest.Mock).mockReturnValue(payload);

      const result = service.verifyAccessToken('valid.token.here');

      expect(mockJwt.verify).toHaveBeenCalledWith('valid.token.here', 'test-secret', {
        algorithms: ['HS256'],
      });
      expect(result).toEqual(payload);
    });

    it('should throw AppError UNAUTHORIZED when jwt.verify throws', () => {
      (mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => service.verifyAccessToken('bad.token')).toThrow(AppError);
      expect(() => service.verifyAccessToken('bad.token')).toThrow(
        'Invalid or expired access token',
      );
    });

    it('should throw AppError with statusCode 401', () => {
      (mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      try {
        service.verifyAccessToken('bad.token');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(401);
        expect((err as AppError).code).toBe('UNAUTHORIZED');
      }
    });
  });

  // ── rotateRefreshToken ──────────────────────────────────────────────────
  describe('rotateRefreshToken', () => {
    const makeStoredToken = (overrides = {}) => ({
      id: 10,
      user_id: MOCK_USER_ID,
      is_revoked: false,
      expires_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      user: { id: MOCK_USER_ID, role: MOCK_ROLE },
      ...overrides,
    });

    it('should revoke old token and return a new token pair', async () => {
      mockRefreshTokenFindByTokenHashWithUser.mockResolvedValue(makeStoredToken());
      mockRefreshTokenUpdate.mockResolvedValue({});
      mockRefreshTokenCreate.mockResolvedValue({});
      (mockJwt.sign as jest.Mock).mockReturnValue('new-access-token');

      const result = await service.rotateRefreshToken('old-refresh-token');

      expect(mockRefreshTokenUpdate).toHaveBeenCalledWith(10, { is_revoked: true });
      expect(result.accessToken).toBe('new-access-token');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should throw UNAUTHORIZED when token is not found', async () => {
      mockRefreshTokenFindByTokenHashWithUser.mockResolvedValue(null);

      await expect(service.rotateRefreshToken('unknown-token')).rejects.toThrow(AppError);
      await expect(service.rotateRefreshToken('unknown-token')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    });

    it('should throw UNAUTHORIZED when token is revoked', async () => {
      mockRefreshTokenFindByTokenHashWithUser.mockResolvedValue(
        makeStoredToken({ is_revoked: true }),
      );

      await expect(service.rotateRefreshToken('revoked-token')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('should throw UNAUTHORIZED when token is expired', async () => {
      mockRefreshTokenFindByTokenHashWithUser.mockResolvedValue(
        makeStoredToken({ expires_at: new Date(Date.now() - 1000) }), // past
      );

      await expect(service.rotateRefreshToken('expired-token')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('should throw UNAUTHORIZED when associated user is missing', async () => {
      mockRefreshTokenFindByTokenHashWithUser.mockResolvedValue(makeStoredToken({ user: null }));

      await expect(service.rotateRefreshToken('orphan-token')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  // ── revokeRefreshToken ──────────────────────────────────────────────────
  describe('revokeRefreshToken', () => {
    it('should call updateMany with is_revoked: true for the hashed token', async () => {
      mockRefreshTokenRevokeByTokenHash.mockResolvedValue({ count: 1 });
      const rawToken = 'some-refresh-token';

      await service.revokeRefreshToken(rawToken);

      expect(mockRefreshTokenRevokeByTokenHash).toHaveBeenCalledWith(service.hashToken(rawToken));
    });
  });
});
