import bcrypt from 'bcryptjs';
import { ClientAccountRepository, UserWithProfile } from '../repositories/account.repository';
import { AppError } from '../../shared/middlewares/error.middleware';
import { Prisma } from '@prisma/client';
import { updateAccountSchema, changePasswordSchema } from '../../shared/validations/account.validation';
import { z } from 'zod';

export type UpdateAccountDTO = z.infer<typeof updateAccountSchema>['body'];
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>['body'];

/**
 * Service handling account-related logic for authenticated client users.
 */
export class ClientAccountService {
  constructor(private readonly accountRepository: ClientAccountRepository) {}

  /**
   * Retrieves the current user's account and profile.
   */
  async getAccount(userId: number): Promise<UserWithProfile> {
    const account = await this.accountRepository.findByIdWithProfile(userId);
    if (!account) {
      throw new AppError('NOT_FOUND', 'User account not found', 404);
    }
    return account;
  }

  /**
   * Updates the current user's basic info and upserts their profile.
   */
  async updateAccount(userId: number, data: UpdateAccountDTO): Promise<UserWithProfile> {
    const account = await this.accountRepository.findByIdWithProfile(userId);
    if (!account) {
      throw new AppError('NOT_FOUND', 'User account not found', 404);
    }

    // Update base user info
    const updateData: Prisma.UserUpdateInput = { name: data.name };
    if (data.phone !== undefined) updateData.phone = data.phone;

    await this.accountRepository.updateUser(userId, updateData);

    // Upsert profile if provided
    if (data.profile) {
      const profileData: Prisma.UserProfileUncheckedCreateWithoutUserInput = {};
      
      if (data.profile.date_of_birth !== undefined) {
        profileData.date_of_birth = data.profile.date_of_birth ? new Date(data.profile.date_of_birth) : null;
      }
      if (data.profile.gender !== undefined) profileData.gender = data.profile.gender;
      if (data.profile.address_line1 !== undefined) profileData.address_line1 = data.profile.address_line1;
      if (data.profile.address_line2 !== undefined) profileData.address_line2 = data.profile.address_line2;
      if (data.profile.city !== undefined) profileData.city = data.profile.city;
      if (data.profile.utc_timezone !== undefined) profileData.utc_timezone = data.profile.utc_timezone;
      if (data.profile.province !== undefined) profileData.province = data.profile.province;
      if (data.profile.postal_code !== undefined) profileData.postal_code = data.profile.postal_code;
      if (data.profile.country !== undefined) profileData.country = data.profile.country;
      if (data.profile.clinic_name !== undefined) profileData.clinic_name = data.profile.clinic_name;
      if (data.profile.photo_url !== undefined) profileData.photo_url = data.profile.photo_url;

      await this.accountRepository.upsertProfile(userId, profileData);
    }

    // Return updated account
    return this.getAccount(userId);
  }

  /**
   * Validates the current password and sets a new one.
   */
  async changePassword(userId: number, data: ChangePasswordDTO): Promise<void> {
    const account = await this.accountRepository.findByIdWithProfile(userId);
    if (!account) {
      throw new AppError('NOT_FOUND', 'User account not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.currentPassword, account.password_hash);
    if (!isPasswordValid) {
      throw new AppError('INVALID_CREDENTIALS', 'Incorrect current password', 400);
    }

    if (data.currentPassword === data.newPassword) {
      throw new AppError('VALIDATION_ERROR', 'New password must be different from current password', 400);
    }

    // Hash and save new password
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);
    await this.accountRepository.updatePasswordHash(userId, newPasswordHash);
  }
}
