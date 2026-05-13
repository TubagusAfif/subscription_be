import bcrypt from 'bcryptjs';
import { SubscriptionAuthService } from '../../../subscription/services/auth.service';
import { AppError } from '../../../shared/middlewares/error.middleware';
import { TokenPair } from '../../../shared/services/token.service';

// --------------------------------------------------------------------------
// Mock bcryptjs
// --------------------------------------------------------------------------
jest.mock('bcryptjs');
const mockBcrypt = jest.mocked(bcrypt);

// --------------------------------------------------------------------------
// Mock TokenService
// --------------------------------------------------------------------------
const mockGenerateTokens = jest.fn();
const mockTokenService = {
  generateTokens: mockGenerateTokens,
} as any;

// --------------------------------------------------------------------------
// Mock PrismaClient
// --------------------------------------------------------------------------
const mockUserFindByEmail = jest.fn();
const mockUserRepository = {
  findByEmail: mockUserFindByEmail,
} as any;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const MOCK_TOKENS: TokenPair = {
  accessToken: 'admin.access.token',
  refreshToken: 'admin-refresh-hex',
};

const makeAdminUser = (overrides = {}) => ({
  id: 2,
  email: 'admin@example.com',
  name: 'Admin User',
  phone: '08111111111',
  password_hash: 'hashed_password',
  role: 'ADMIN' as const,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------
describe('SubscriptionAuthService', () => {
  let service: SubscriptionAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionAuthService(mockUserRepository);
  });

  describe('login', () => {
    it('should return user (without password_hash) for a valid ADMIN', async () => {
      const user = makeAdminUser();
      mockUserFindByEmail.mockResolvedValue(user);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: user.email, password: 'adminpass' });

      expect(result).not.toHaveProperty('password_hash');
      expect(result.role).toBe('ADMIN');
    });

    it('should throw AppError INVALID_CREDENTIALS (401) when user is not found', async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
    });

    it('should throw AppError INVALID_CREDENTIALS (401) when password is wrong', async () => {
      mockUserFindByEmail.mockResolvedValue(makeAdminUser());
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@example.com', password: 'wrongpass' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
    });

    it('should throw AppError ACCOUNT_INACTIVE (403) when admin account is deactivated', async () => {
      mockUserFindByEmail.mockResolvedValue(makeAdminUser({ is_active: false }));
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'admin@example.com', password: 'adminpass' }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE', statusCode: 403 });
    });

    it('should throw AppError FORBIDDEN (403) when user has OWNER role', async () => {
      mockUserFindByEmail.mockResolvedValue(makeAdminUser({ role: 'OWNER' }));
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'admin@example.com', password: 'adminpass' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    });

    it('should throw AppError FORBIDDEN (403) for any non-ADMIN role', async () => {
      const roles = ['OWNER', 'STAFF', 'CASHIER'] as const;

      for (const role of roles) {
        jest.clearAllMocks();
        mockUserFindByEmail.mockResolvedValue(makeAdminUser({ role }));
        (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

        await expect(
          service.login({ email: 'admin@example.com', password: 'pass' }),
        ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
      }
    });

    it('should not pass when validation fails', async () => {
      // password wrong → short-circuit before role check
      mockUserFindByEmail.mockResolvedValue(makeAdminUser({ role: 'OWNER' }));
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: 'x@x.com', password: 'x' })).rejects.toThrow(AppError);
    });
  });
});
