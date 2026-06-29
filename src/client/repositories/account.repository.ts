import { PrismaClient, Prisma, User, UserProfile } from '@prisma/client';

export type UserWithProfile = User & { profile: UserProfile | null };

/**
 * Repository for handling database operations related to the Client User Account and Profile.
 */
export class ClientAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds a user by ID including their profile.
   */
  async findByIdWithProfile(id: number): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  /**
   * Updates basic user fields (e.g., name, phone).
   */
  async updateUser(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Upserts a user's profile.
   */
  async upsertProfile(
    userId: number,
    data: Prisma.UserProfileUncheckedCreateWithoutUserInput,
  ): Promise<UserProfile> {
    return this.prisma.userProfile.upsert({
      where: { user_id: userId },
      update: data,
      create: { ...data, user_id: userId },
    });
  }

  /**
   * Updates the user's password hash.
   */
  async updatePasswordHash(id: number, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password_hash: passwordHash },
    });
  }
}
