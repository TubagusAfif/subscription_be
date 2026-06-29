import { AccountService } from '../../../../src/shared/services/account.service';
import { AccountRepository } from '../../../../src/shared/repositories/account.repository';
import { AppError } from '../../../../src/shared/middlewares/error.middleware';
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AccountService', () => {
  let accountService: AccountService;
  let mockAccountRepository: jest.Mocked<AccountRepository>;

  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    password_hash: 'hashedpassword',
    role: 'ADMIN',
    phone: null,
    is_active: true,
    created_at: new Date(),
    created_by: null,
    updated_at: new Date(),
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
  };

  const mockProfile = {
    id: 1,
    user_id: 1,
    date_of_birth: null,
    gender: null,
    address_line1: null,
    address_line2: null,
    city: null,
    utc_timezone: null,
    province: null,
    postal_code: null,
    country: null,
    clinic_name: null,
    photo_url: null,
    created_at: new Date(),
    created_by: null,
    updated_at: new Date(),
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
  };

  const mockUserWithProfile = { ...mockUser, profile: mockProfile };

  beforeEach(() => {
    mockAccountRepository = {
      findByIdWithProfile: jest.fn(),
      updateUser: jest.fn(),
      upsertProfile: jest.fn(),
      updatePasswordHash: jest.fn(),
    } as unknown as jest.Mocked<AccountRepository>;

    accountService = new AccountService(mockAccountRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccount', () => {
    it('should return user account with profile if found', async () => {
      mockAccountRepository.findByIdWithProfile.mockResolvedValue(mockUserWithProfile as any);

      const result = await accountService.getAccount(1);

      expect(mockAccountRepository.findByIdWithProfile).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUserWithProfile);
    });

    it('should throw NOT_FOUND if user does not exist', async () => {
      mockAccountRepository.findByIdWithProfile.mockResolvedValue(null);

      await expect(accountService.getAccount(999)).rejects.toThrow(AppError);
    });
  });

  describe('updateAccount', () => {
    it('should update user info successfully', async () => {
      mockAccountRepository.findByIdWithProfile.mockResolvedValue(mockUserWithProfile as any);
      mockAccountRepository.updateUser.mockResolvedValue(mockUser as any);

      const updateData = {
        name: 'Jane Doe',
        phone: '1234567890',
        profile: null,
      };

      await accountService.updateAccount(1, updateData);

      expect(mockAccountRepository.updateUser).toHaveBeenCalledWith(1, {
        name: 'Jane Doe',
        phone: '1234567890',
      });
      // Should query the updated account again
      expect(mockAccountRepository.findByIdWithProfile).toHaveBeenCalledTimes(2);
    });

    it('should update profile if profile data is provided', async () => {
      mockAccountRepository.findByIdWithProfile.mockResolvedValue(mockUserWithProfile as any);
      mockAccountRepository.updateUser.mockResolvedValue(mockUser as any);
      mockAccountRepository.upsertProfile.mockResolvedValue(mockProfile as any);

      const updateData = {
        name: 'Jane Doe',
        profile: {
          city: 'Jakarta',
          country: 'ID',
        },
      };

      await accountService.updateAccount(1, updateData as any);

      expect(mockAccountRepository.upsertProfile).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          city: 'Jakarta',
          country: 'ID',
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should change password if current password is valid', async () => {
      mockAccountRepository.findByIdWithProfile.mockResolvedValue(mockUserWithProfile as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      mockAccountRepository.updatePasswordHash.mockResolvedValue({
        ...mockUser,
        password_hash: 'newHashedPassword',
      } as any);

      await accountService.changePassword(1, {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'hashedpassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockAccountRepository.updatePasswordHash).toHaveBeenCalledWith(1, 'newHashedPassword');
    });

    it('should throw INVALID_CREDENTIALS if current password is wrong', async () => {
      mockAccountRepository.findByIdWithProfile.mockResolvedValue(mockUserWithProfile as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        accountService.changePassword(1, {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(AppError);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockAccountRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });
});
