import { PrismaClient, Prisma, Order } from '@prisma/client';

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.OrderUncheckedCreateInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  async findRecentByUserId(userId: number, limit: number = 5) {
    return this.prisma.order.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      include: {
        sku: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
