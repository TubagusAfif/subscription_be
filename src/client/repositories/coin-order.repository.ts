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

  async updatePaymentInfo(id: number, pgResponseId: string, redirectUrl: string): Promise<CoinOrder> {
    return this.prisma.coinOrder.update({
      where: { id },
      data: {
        pg_response_id: pgResponseId,
        redirect_url: redirectUrl,
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
  }) {
    const { startDate, endDate, paymentMethodId, status } = filters;

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

    const result = await this.prisma.$queryRaw<any[]>`
      SELECT 
        DATE(created_at) as date,
        COUNT(id)::int as total_orders,
        SUM(coin_price)::numeric as total_coin_price,
        SUM(tax_amount)::numeric as total_tax_amount,
        SUM(gateway_fee)::numeric as total_gateway_fee,
        SUM(price_paid)::numeric as total_price_paid
      FROM coin_orders
      WHERE ${whereQuery}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    return result;
  }
}
