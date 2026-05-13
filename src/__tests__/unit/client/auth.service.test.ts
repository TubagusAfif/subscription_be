import bcrypt from 'bcryptjs';
import { ClientAuthService } from '../../../client/services/auth.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

// --------------------------------------------------------------------------
// Mock bcryptjs
// --------------------------------------------------------------------------
jest.mock('bcryptjs');
const mockBcrypt = jest.mocked(bcrypt);

// --------------------------------------------------------------------------
// Mock UserRepository
// --------------------------------------------------------------------------
const mockUserFindByEmail = jest.fn();
const mockUserFindByActivationToken = jest.fn();
const mockUserCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserRepository = {
  findByEmail: mockUserFindByEmail,
  findByActivationToken: mockUserFindByActivationToken,
  create: mockUserCreate,
  update: mockUserUpdate,
} as any;

// --------------------------------------------------------------------------
// Mock MailService
// --------------------------------------------------------------------------
const mockSendActivationEmail = jest.fn();
const mockMailService = {
  sendActivationEmail: mockSendActivationEmail,
} as any;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const makeUser = (overrides = {}) => ({
  id: 1,
  email: 'owner@example.com',
  name: 'Test Owner',
  phone: '08123456789',
  password_hash: 'hashed_password',
  role: 'OWNER' as const,
  is_active: true,
  activation_token: null,
  activation_token_expires_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------
describe('ClientAuthService', () => {
  let service: ClientAuthService;

  const mockTx = {
    user: { create: mockUserCreate },
    coinCurrency: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
    coinWallet: { create: jest.fn() },
  };

  const mockPrisma = {
    $transaction: jest.fn(async (callback) => {
      return callback(mockTx);
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientAuthService({
      userRepository: mockUserRepository,
      mailService: mockMailService,
      prisma: mockPrisma as any,
    });
  });

  // ── register ─────────────────────────────────────────────────────────────
  describe('register', () => {
    it('should create a user with is_active=false, send activation email, and return message', async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      const user = makeUser({ is_active: false, activation_token: 'some-uuid' });
      mockTx.user.create.mockResolvedValue(user);
      mockSendActivationEmail.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'owner@example.com',
        name: 'Test Owner',
        phone: '08123456789',
        password: 'secret123',
      });

      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'owner@example.com',
            role: 'OWNER',
            is_active: false,
            password_hash: 'hashed_password',
            activation_token: expect.any(String),
            activation_token_expires_at: expect.any(Date),
          }),
        }),
      );

      expect(mockSendActivationEmail).toHaveBeenCalledWith(
        { name: 'Test Owner', email: 'owner@example.com' },
        expect.any(String), // activation token
      );

      // Should return a message, not user data
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('check your email');
    });

    it('should throw AppError USER_EXISTS (409) when email is already taken', async () => {
      mockUserFindByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: 'owner@example.com', password: 'x', name: 'X', phone: '0' }),
      ).rejects.toMatchObject({
        code: 'USER_EXISTS',
        statusCode: 409,
      });

      expect(mockTx.user.create).not.toHaveBeenCalled();
      expect(mockSendActivationEmail).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('securely_hashed');
      mockTx.user.create.mockResolvedValue(makeUser({ password_hash: 'securely_hashed' }));
      mockSendActivationEmail.mockResolvedValue(undefined);

      await service.register({ email: 'a@b.com', password: 'plaintext', name: 'A', phone: '0' });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
    });

    it('should create profile data when profile object is provided', async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockTx.user.create.mockResolvedValue(makeUser());
      mockSendActivationEmail.mockResolvedValue(undefined);

      await service.register({
        email: 'a@b.com',
        password: 'password123',
        name: 'Dr. Test',
        profile: {
          clinic_name: 'Test Clinic',
          city: 'Jakarta',
          date_of_birth: '1990-01-15',
        },
      });

      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profile: {
              create: expect.objectContaining({
                clinic_name: 'Test Clinic',
                city: 'Jakarta',
                date_of_birth: expect.any(Date),
              }),
            },
          }),
        }),
      );
    });
  });

  // ── activate ─────────────────────────────────────────────────────────────
  describe('activate', () => {
    it('should activate a user successfully', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      mockUserFindByActivationToken.mockResolvedValue(
        makeUser({
          is_active: false,
          activation_token: 'valid-token',
          activation_token_expires_at: futureDate,
        }),
      );
      mockUserUpdate.mockResolvedValue(makeUser({ is_active: true }));

      const result = await service.activate('valid-token');

      expect(mockUserUpdate).toHaveBeenCalledWith(1, {
        is_active: true,
        activation_token: null,
        activation_token_expires_at: null,
      });
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('activated successfully');
    });

    it('should throw INVALID_TOKEN (400) when token does not exist', async () => {
      mockUserFindByActivationToken.mockResolvedValue(null);

      await expect(service.activate('bad-token')).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
        statusCode: 400,
      });
    });

    it('should throw TOKEN_EXPIRED (400) when activation token has expired', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      mockUserFindByActivationToken.mockResolvedValue(
        makeUser({
          is_active: false,
          activation_token: 'expired-token',
          activation_token_expires_at: pastDate,
        }),
      );

      await expect(service.activate('expired-token')).rejects.toMatchObject({
        code: 'TOKEN_EXPIRED',
        statusCode: 400,
      });
    });

    it('should throw ALREADY_ACTIVE (400) if account is already activated', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      mockUserFindByActivationToken.mockResolvedValue(
        makeUser({
          is_active: true,
          activation_token: 'used-token',
          activation_token_expires_at: futureDate,
        }),
      );

      await expect(service.activate('used-token')).rejects.toMatchObject({
        code: 'ALREADY_ACTIVE',
        statusCode: 400,
      });
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should silently succeed if user does not exist (prevent enumeration)', async () => {
      mockUserFindByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'ghost@example.com' });

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('reset link has been sent');
      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(mockSendActivationEmail).not.toHaveBeenCalled(); // mail service spy is generic, in real we added sendPasswordResetEmail
    });

    it('should generate reset token and send email if user exists', async () => {
      const user = makeUser();
      mockUserFindByEmail.mockResolvedValue(user);
      mockMailService.sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);

      const result = await service.forgotPassword({ email: user.email });

      expect(mockUserUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          reset_token: expect.any(String),
          reset_token_expires_at: expect.any(Date),
        }),
      );

      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        { name: user.name, email: user.email },
        expect.any(String),
      );

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('reset link has been sent');
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      mockUserRepository.findByResetToken = jest.fn().mockResolvedValue(
        makeUser({
          reset_token: 'valid-reset-token',
          reset_token_expires_at: futureDate,
        }),
      );
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      mockUserUpdate.mockResolvedValue(makeUser());

      const result = await service.resetPassword({ token: 'valid-reset-token', password: 'new-password' });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('new-password', 10);
      expect(mockUserUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          password_hash: 'new_hashed_password',
          reset_token: null,
          reset_token_expires_at: null,
        }),
      );

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('reset successfully');
    });

    it('should throw INVALID_TOKEN (400) if reset token is invalid', async () => {
      mockUserRepository.findByResetToken = jest.fn().mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'invalid', password: 'new' })).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
        statusCode: 400,
      });
    });

    it('should throw TOKEN_EXPIRED (400) if reset token is expired', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      mockUserRepository.findByResetToken = jest.fn().mockResolvedValue(
        makeUser({
          reset_token: 'expired-token',
          reset_token_expires_at: pastDate,
        }),
      );

      await expect(service.resetPassword({ token: 'expired-token', password: 'new' })).rejects.toMatchObject({
        code: 'TOKEN_EXPIRED',
        statusCode: 400,
      });
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should return user (without password_hash) on success', async () => {
      const user = makeUser();
      mockUserFindByEmail.mockResolvedValue(user);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: user.email, password: 'secret' });

      expect(result).not.toHaveProperty('password_hash');
      expect(result.email).toBe(user.email);
    });

    it('should throw AppError INVALID_CREDENTIALS (401) when user is not found', async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'wrong' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
    });

    it('should throw AppError INVALID_CREDENTIALS (401) when password does not match', async () => {
      mockUserFindByEmail.mockResolvedValue(makeUser());
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'owner@example.com', password: 'wrong' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
    });

    it('should throw AppError ACCOUNT_INACTIVE (403) when user is not activated', async () => {
      mockUserFindByEmail.mockResolvedValue(makeUser({ is_active: false }));
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'owner@example.com', password: 'secret' }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE', statusCode: 403 });
    });

    it('should throw an AppError instance (not just a generic Error)', async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.login({ email: 'x@x.com', password: 'x' });
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
      }
    });
  });
});
