import { PrismaClient, Prisma, User } from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for handling database operations related to the User entity.
---------------------------------------------------------------
**/
export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** 
  ---------------------------------------------------------------
    Finds a single user record by their unique email address.
  ---------------------------------------------------------------
  **/
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** 
  ---------------------------------------------------------------
    Finds a single user record by their ID, including profile.
  ---------------------------------------------------------------
  **/
  async findByIdWithProfile(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ 
      where: { id, deleted_at: null },
      include: { profile: true } 
    });
  }

  async getUserStats(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    let newUsersFilter: any = dateFilter;
    if (!startDate && !endDate) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      newUsersFilter = { created_at: { gte: startOfMonth } };
    }

    const [totalUsers, activeUsers, newUsersThisMonth] = await Promise.all([
      this.prisma.user.count({
        where: { deleted_at: null, ...dateFilter },
      }),
      this.prisma.user.count({
        where: { deleted_at: null, is_active: true, ...dateFilter },
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          ...newUsersFilter,
        },
      }),
    ]);

    return {
      total_users: totalUsers,
      active_users: activeUsers,
      new_users_this_month: newUsersThisMonth,
    };
  }

  /** 
  ---------------------------------------------------------------
    Finds a single user record by their activation token.
  ---------------------------------------------------------------
  **/
  async findByActivationToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { activation_token: token } });
  }

  /** 
  ---------------------------------------------------------------
    Finds a single user record by their reset token.
  ---------------------------------------------------------------
  **/
  async findByResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { reset_token: token } });
  }

  /** 
  ---------------------------------------------------------------
    Creates a new user record in the database, optionally creating
    a nested UserProfile in the same atomic transaction.
  ---------------------------------------------------------------
  **/
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  /** 
  ---------------------------------------------------------------
    Updates a user record by ID.
  ---------------------------------------------------------------
  **/
  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}

