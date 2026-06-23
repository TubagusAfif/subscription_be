import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  sub: number; // user.id
  role: Role;
  iat?: number;
  exp?: number;
}

/** 
---------------------------------------------------------------
  Service handling JSON Web Token generation, verification, and rotation.
---------------------------------------------------------------
**/
export class TokenService {
  constructor(private readonly refreshTokenRepository: RefreshTokenRepository) {}

  /** 
  ---------------------------------------------------------------
    Generates a short-lived access JWT for API authentication.
  ---------------------------------------------------------------
  **/
  generateAccessToken(userId: number, role: Role): string {
    return jwt.sign({ sub: userId, role }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
    });
  }

  /** 
  ---------------------------------------------------------------
    Generates a secure random cryptographically strong refresh token string.
  ---------------------------------------------------------------
  **/
  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  /** 
  ---------------------------------------------------------------
    Hashes a token string for secure database storage.
  ---------------------------------------------------------------
  **/
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** 
  ---------------------------------------------------------------
    Generates a new pair of access and refresh tokens, storing the refresh token in the DB.
  ---------------------------------------------------------------
  **/
  async generateTokens(userId: number, role: Role): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(userId, role);
    const refreshToken = this.generateRefreshToken();

    // Store hashed refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.create({
      user_id: userId,
      token_hash: this.hashToken(refreshToken),
      expires_at: expiresAt,
    });

    return { accessToken, refreshToken };
  }

  /** 
  ---------------------------------------------------------------
    Verifies a given access token string and returns its decoded payload.
  ---------------------------------------------------------------
  **/
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as unknown as JWTPayload;
    } catch (err) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired access token', 401);
    }
  }

  /** 
  ---------------------------------------------------------------
    Rotates a given refresh token directly, returning a brand new token pair.
  ---------------------------------------------------------------
  **/
  async rotateRefreshToken(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findByTokenHashWithUser(tokenHash);

    if (
      !storedToken ||
      storedToken.is_revoked ||
      storedToken.expires_at < new Date() ||
      !storedToken.user
    ) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401);
    }

    // Revoke old token
    await this.refreshTokenRepository.update(storedToken.id, { is_revoked: true });

    // Generate new pair
    const role = storedToken.user?.role || ('OWNER' as Role);
    return this.generateTokens(storedToken.user_id, role as Role);
  }

  /** 
  ---------------------------------------------------------------
    Revokes a refresh token completely by its plain-text value.
  ---------------------------------------------------------------
  **/
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await this.refreshTokenRepository.revokeByTokenHash(tokenHash);
  }
}
