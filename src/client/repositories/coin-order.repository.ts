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
      include: { bundle: true, currency: true, payment_method: true },
    });
  }

  async findByPgOrderId(pgOrderId: string): Promise<CoinOrder | null> {
    return this.prisma.coinOrder.findUnique({
      where: { pg_order_id: pgOrderId, deleted_at: null },
      include: { bundle: true, currency: true, payment_method: true },
    });
  }

  async findByPgResponseId(pgResponseId: string): Promise<CoinOrder | null> {
    return this.prisma.coinOrder.findUnique({
      where: { pg_response_id: pgResponseId, deleted_at: null },
      include: { bundle: true, currency: true, payment_method: true },
    });
  }

  async findByUserId(userId: number): Promise<CoinOrder[]> {
    return this.prisma.coinOrder.findMany({
      where: { user_id: userId, deleted_at: null },
      include: { bundle: true, currency: true, payment_method: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findPendingByUserId(userId: number): Promise<CoinOrder | null> {
    return this.prisma.coinOrder.findFirst({
      where: {
        user_id: userId,
        status: 'PENDING',
        deleted_at: null,
      },
      // Relations are needed when the pending order is returned to the client
      // to resume payment (payment_method label, currency). Harmless for the
      // existence/age check in assertNoActivePendingOrder, which ignores them.
      include: { bundle: true, currency: true, payment_method: true },
    });
  }

  async getOrderStats(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    const [totalCoinOrders, paidCoinOrders] = await Promise.all([
      this.prisma.coinOrder.count({
        where: { deleted_at: null, ...dateFilter },
      }),
      this.prisma.coinOrder.count({
        where: { deleted_at: null, status: 'PAID', ...dateFilter },
      }),
    ]);

    return {
      total_coin_orders: totalCoinOrders,
      paid_coin_orders: paidCoinOrders,
    };
  }

  async getRecentOrdersWithUsers(limit: number, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    return this.prisma.coinOrder.findMany({
      where: { deleted_at: null, ...dateFilter },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        payment_method: true,
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

  /**
   * Atomic check-and-set: marks the order FAILED only if it is still PENDING.
   * Returns the number of rows updated (0 if it was already resolved).
   */
  async markFailedIfPending(id: number): Promise<number> {
    const result = await this.prisma.coinOrder.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    return result.count;
  }

  async updatePaymentInfo(
    id: number,
    pgResponseId: string,
    redirectUrl: string,
    paymentGateway: string,
    snapToken?: string,
  ): Promise<CoinOrder> {
    return this.prisma.coinOrder.update({
      where: { id },
      data: {
        pg_response_id: pgResponseId,
        redirect_url: redirectUrl,
        payment_gateway: paymentGateway,
        ...(snapToken ? { snap_token: snapToken } : {}),
      },
    });
  }

  async getTransactionReport(filters: {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    paymentMethodId?: number | undefined;
    status?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }) {
    const { startDate, endDate, paymentMethodId, status, page, limit } = filters;

    const where: Prisma.CoinOrderWhereInput = {
      deleted_at: null,
      ...(status ? { status: status as any } : {}),
      ...(paymentMethodId ? { payment_method_id: paymentMethodId } : {}),
      ...(startDate || endDate
        ? {
            created_at: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.prisma.coinOrder.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            payment_method: true,
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.coinOrder.count({ where }),
      ]);
      return { data, total };
    } else {
      const data = await this.prisma.coinOrder.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          payment_method: true,
        },
        orderBy: { created_at: 'desc' },
      });
      return { data, total: data.length };
    }
  }
  async getChartReport(filters: {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    paymentMethodId?: number | undefined;
    status?: string | undefined;
    interval?: 'day' | 'week' | 'month';
  }) {
    const { startDate, endDate, paymentMethodId, status, interval = 'day' } = filters;

    let conditions = [Prisma.sql`deleted_at IS NULL`];

    if (status) {
      conditions.push(Prisma.sql`status = ${status}::"CoinOrderStatus"`);
    }
    if (paymentMethodId) {
      conditions.push(Prisma.sql`payment_method_id = ${paymentMethodId}`);
    }
    if (startDate) {
      conditions.push(Prisma.sql`created_at >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(Prisma.sql`created_at <= ${endDate}`);
    }

    const whereQuery = Prisma.join(conditions, ' AND ');

    let dateTrunc: Prisma.Sql;
    if (interval === 'month') {
      dateTrunc = Prisma.sql`DATE_TRUNC('month', created_at)`;
    } else if (interval === 'week') {
      dateTrunc = Prisma.sql`DATE_TRUNC('week', created_at)`;
    } else {
      dateTrunc = Prisma.sql`DATE(created_at)`;
    }

    const result = await this.prisma.$queryRaw<any[]>`
      SELECT 
        ${dateTrunc} as date,
        COUNT(id)::int as total_orders,
        SUM(coin_price)::numeric as total_coin_price,
        SUM(tax_amount)::numeric as total_tax_amount,
        SUM(gateway_fee)::numeric as total_gateway_fee,
        SUM(price_paid)::numeric as total_price_paid
      FROM coin_orders
      WHERE ${whereQuery}
      GROUP BY ${dateTrunc}
      ORDER BY ${dateTrunc} ASC
    `;

    return result;
  }
}
