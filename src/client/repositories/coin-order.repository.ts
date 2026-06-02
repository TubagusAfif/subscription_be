import { PrismaClient, Prisma, CoinOrder } from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for managing Coin Order database operations.
---------------------------------------------------------------
**/
export class CoinOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.CoinOrderUncheckedCreateInput): Promise<CoinOrder> {
    return this.prisma.coinOrder.create({ data });
  }

  async findById(id: number): Promise<CoinOrder | null> {
    return this.prisma.coinOrder.findUnique({
      where: { id, deleted_at: null },
      include: { bundle: true, currency: true },
    });
  }

  async findByPgOrderId(pgOrderId: string): Promise<CoinOrder | null> {
    return this.prisma.coinOrder.findUnique({
      where: { pg_order_id: pgOrderId, deleted_at: null },
    });
  }

  async findByPgResponseId(pgResponseId: string): Promise<CoinOrder | null> {
    return this.prisma.coinOrder.findUnique({
      where: { pg_response_id: pgResponseId, deleted_at: null },
    });
  }

  async findByUserId(userId: number): Promise<CoinOrder[]> {
    return this.prisma.coinOrder.findMany({
      where: { user_id: userId, deleted_at: null },
      include: { bundle: true, currency: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async getOrderStats() {
    const [totalCoinOrders, paidCoinOrders] = await Promise.all([
      this.prisma.coinOrder.count({
        where: { deleted_at: null },
      }),
      this.prisma.coinOrder.count({
        where: { deleted_at: null, status: 'PAID' },
      }),
    ]);

    return {
      total_coin_orders: totalCoinOrders,
      paid_coin_orders: paidCoinOrders,
    };
  }

  async getRecentOrdersWithUsers(limit: number) {
    return this.prisma.coinOrder.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateStatus(
    id: number,
    status: Prisma.CoinOrderUpdateInput['status'],
  ): Promise<CoinOrder> {
    const data: Prisma.CoinOrderUpdateInput = {};
    if (status !== undefined) {
      data.status = status;
    }
    return this.prisma.coinOrder.update({
      where: { id },
      data,
    });
  }
}
