import { PrismaClient, Prisma, RefreshToken, User } from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for managing refresh tokens in the database.
---------------------------------------------------------------
**/
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** 
  ---------------------------------------------------------------
    Creates a new refresh token record.
  ---------------------------------------------------------------
  **/
  async create(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  /** 
  ---------------------------------------------------------------
    Retrieves a refresh token by its hashed value, including the associated user.
  ---------------------------------------------------------------
  **/
  async findByTokenHashWithUser(
    tokenHash: string,
  ): Promise<(RefreshToken & { user: User }) | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });
  }

  /** 
  ---------------------------------------------------------------
    Updates a specific refresh token by its ID.
  ---------------------------------------------------------------
  **/
  async update(id: number, data: Prisma.RefreshTokenUpdateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data,
    });
  }

  /** 
  ---------------------------------------------------------------
    Revokes all refresh tokens matching a specific token hash.
  ---------------------------------------------------------------
  **/
  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token_hash: tokenHash },
      data: { is_revoked: true },
    });
  }
}
