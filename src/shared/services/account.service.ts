import bcrypt from 'bcryptjs';
import { AccountRepository, UserWithProfile } from '../repositories/account.repository';
import { AppError } from '../middlewares/error.middleware';
import { Prisma } from '@prisma/client';
import { updateAccountSchema, changePasswordSchema } from '../validations/account.validation';

import { z } from 'zod';

export type UpdateAccountDTO = z.infer<typeof updateAccountSchema>['body'];
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>['body'];

/**
 * Service handling account-related logic for authenticated users.
 */
export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

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
    await this.accountRepository.updateUser(userId, {
      name: data.name,
      phone: data.phone ?? null,
    });

    // Upsert profile if provided
    if (data.profile) {
      const profileData: Prisma.UserProfileUncheckedCreateWithoutUserInput = {
        date_of_birth: data.profile.date_of_birth ? new Date(data.profile.date_of_birth) : null,
        gender: data.profile.gender ?? null,
        address_line1: data.profile.address_line1 ?? null,
        address_line2: data.profile.address_line2 ?? null,
        city: data.profile.city ?? null,
        utc_timezone: data.profile.utc_timezone ?? null,
        province: data.profile.province ?? null,
        postal_code: data.profile.postal_code ?? null,
        country: data.profile.country ?? null,
        clinic_name: data.profile.clinic_name ?? null,
        photo_url: data.profile.photo_url ?? null,
      };
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

    // Hash and save new password
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);
    await this.accountRepository.updatePasswordHash(userId, newPasswordHash);
  }
}
