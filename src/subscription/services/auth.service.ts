import bcrypt from 'bcryptjs';
import { UserRepository } from '../../shared/repositories/user.repository';
import { AppError } from '../../shared/middlewares/error.middleware';

/** 
---------------------------------------------------------------
  Service handling authentication logic for Subscription/Admin users.
---------------------------------------------------------------
**/
export class SubscriptionAuthService {
  constructor(private readonly userRepository: UserRepository) {}

  /** 
  ---------------------------------------------------------------
    Authenticates an admin user, validating credentials and permissions.
  ---------------------------------------------------------------
  **/
  async login(data: any): Promise<any> {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (!user.is_active) {
      throw new AppError('ACCOUNT_INACTIVE', 'This account has been deactivated', 403);
    }

    if (user.role !== 'ADMIN') {
      throw new AppError('FORBIDDEN', 'Access denied. Administrator privileges required.', 403);
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
