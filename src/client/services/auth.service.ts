import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../../shared/repositories/user.repository';
import { MailService } from '../../shared/services/mail.service';
import { AppError } from '../../shared/middlewares/error.middleware';

export interface ClientAuthServiceDeps {
  userRepository: UserRepository;
  mailService: MailService;
  prisma: PrismaClient;
}

/** 
---------------------------------------------------------------
  Service handling authentication logic for Client users.
---------------------------------------------------------------
**/
export class ClientAuthService {
  private readonly userRepository: UserRepository;
  private readonly mailService: MailService;
  private readonly prisma: PrismaClient;

  constructor(deps: ClientAuthServiceDeps) {
    this.userRepository = deps.userRepository;
    this.mailService = deps.mailService;
    this.prisma = deps.prisma;
  }

  /** 
  ---------------------------------------------------------------
    Registers a new client user with is_active=false, generates activation
    token, sends activation email. Does NOT return auth tokens.
  ---------------------------------------------------------------
  **/
  async register(data: any): Promise<{ message: string }> {
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new AppError('USER_EXISTS', 'A user with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Generate activation token (UUID-like)
    const activationToken = crypto.randomUUID();
    const activationTokenExpiresAt = new Date();
    activationTokenExpiresAt.setHours(activationTokenExpiresAt.getHours() + 24);

    let profilePayload = {};
    if (data.profile) {
      const profileData = { ...data.profile };

      // Convert date string to Date object if present
      if (profileData.date_of_birth) {
        profileData.date_of_birth = new Date(profileData.date_of_birth);
      }

      // Remove undefined fields to satisfy Prisma's strict optional types
      Object.keys(profileData).forEach((key) => {
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });

      profilePayload = { profile: { create: profileData } };
    }

    // Use transaction to atomically create user + default wallet
    const user = await this.prisma.$transaction(async (tx) => {
      // Find active currency first
      const activeCurrency = await tx.coinCurrency.findFirst({
        where: { is_active: true, deleted_at: null },
      });

      if (!activeCurrency) {
        throw new AppError('NO_ACTIVE_CURRENCY', 'Cannot create wallet: No active currency is configured in the system.', 500);
      }

      const newUser = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          password_hash: passwordHash,
          role: 'OWNER',
          is_active: false,
          activation_token: activationToken,
          activation_token_expires_at: activationTokenExpiresAt,
          ...profilePayload,
        },
      });

      // Auto-create default wallet with 0 balance
      await tx.coinWallet.create({
        data: {
          user_id: newUser.id,
          balance: 0,
          currency_id: activeCurrency.id,
          created_by: newUser.id,
          updated_by: newUser.id,
        },
      });

      return newUser;
    });

    // Send activation email
    await this.mailService.sendActivationEmail(
      { name: user.name, email: user.email },
      activationToken,
    );

    return { message: 'Registration successful. Please check your email to activate your account.' };
  }

  /** 
  ---------------------------------------------------------------
    Activates a user account via their activation token.
  ---------------------------------------------------------------
  **/
  async activate(token: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByActivationToken(token);

    if (!user) {
      throw new AppError('INVALID_TOKEN', 'Invalid or expired activation token', 400);
    }

    if (user.activation_token_expires_at && user.activation_token_expires_at < new Date()) {
      throw new AppError('TOKEN_EXPIRED', 'Activation token has expired. Please register again.', 400);
    }

    if (user.is_active) {
      throw new AppError('ALREADY_ACTIVE', 'Account is already activated', 400);
    }

    await this.userRepository.update(user.id, {
      is_active: true,
      activation_token: null,
      activation_token_expires_at: null,
    });

    return { message: 'Account activated successfully. You can now log in.' };
  }

  /** 
  ---------------------------------------------------------------
    Generates a password reset token and sends an email. 
  ---------------------------------------------------------------
  **/
  async forgotPassword(data: { email: string }): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(data.email);

    // If no user is found, silently succeed. This prevents email enumeration.
    if (!user) {
      return { message: 'If an account exists for this email, a password reset link has been sent.' };
    }

    const resetToken = crypto.randomUUID();
    const resetTokenExpiresAt = new Date();
    resetTokenExpiresAt.setHours(resetTokenExpiresAt.getHours() + 1); // 1-hour expiry

    await this.userRepository.update(user.id, {
      reset_token: resetToken,
      reset_token_expires_at: resetTokenExpiresAt,
    });

    await this.mailService.sendPasswordResetEmail(
      { name: user.name, email: user.email },
      resetToken,
    );

    return { message: 'If an account exists for this email, a password reset link has been sent.' };
  }

  /** 
  ---------------------------------------------------------------
    Resets the user's password using the provided reset token.
  ---------------------------------------------------------------
  **/
  async resetPassword(data: any): Promise<{ message: string }> {
    const user = await this.userRepository.findByResetToken(data.token);

    if (!user) {
      throw new AppError('INVALID_TOKEN', 'Invalid or expired password reset token', 400);
    }

    if (user.reset_token_expires_at && user.reset_token_expires_at < new Date()) {
      throw new AppError('TOKEN_EXPIRED', 'Password reset token has expired. Please request a new one.', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    await this.userRepository.update(user.id, {
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires_at: null,
    });

    return { message: 'Password has been reset successfully. You can now log in.' };
  }

  /** 
  ---------------------------------------------------------------
    Authenticates a client user and validates their credentials.
  ---------------------------------------------------------------
  **/
  async login(data: any): Promise<any> {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (!user.is_active) {
      throw new AppError('ACCOUNT_INACTIVE', 'Your account is not yet activated. Please check your email for the activation link.', 403);
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
