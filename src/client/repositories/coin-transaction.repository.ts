import { PrismaClient, Prisma, CoinTransaction } from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for managing Coin Transaction log entries.
---------------------------------------------------------------
**/
export class CoinTransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.CoinTransactionUncheckedCreateInput): Promise<CoinTransaction> {
    return this.prisma.coinTransaction.create({ data });
  }

  async findByUserId(userId: number): Promise<CoinTransaction[]> {
    return this.prisma.coinTransaction.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findRecentByUserId(userId: number, limit: number = 5) {
    return this.prisma.coinTransaction.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getRevenueStats(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    const [topupAgg, spendAgg] = await Promise.all([
      this.prisma.coinTransaction.aggregate({
        _sum: { amount: true },
        where: { deleted_at: null, type: 'TOPUP', ...dateFilter },
      }),
      this.prisma.coinTransaction.aggregate({
        _sum: { amount: true },
        where: { deleted_at: null, type: 'SPEND', ...dateFilter },
      }),
    ]);

    return {
      total_coins_purchased: topupAgg._sum.amount,
      total_coins_spent: spendAgg._sum.amount,
    };
  }

  async findByWalletId(walletId: number): Promise<CoinTransaction[]> {
    return this.prisma.coinTransaction.findMany({
      where: { wallet_id: walletId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  // ===========================================================================
  // Coin-payment reporting (transaction-based)
  //
  // Source of truth is the TOPUP ledger, joined to the originating coin_orders
  // (via ref_id) for the monetary figures and to payment_methods for the method
  // name. Reports filter/group by payment_method_id and bucket by the actual
  // payment time (coin_transactions.created_at).
  // ===========================================================================

  /** Shared WHERE clause for the coin-payment report queries. */
  private paymentReportWhere(filters: {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    paymentMethodId?: number | undefined;
  }): Prisma.Sql {
    const { startDate, endDate, paymentMethodId } = filters;
    const conditions = [
      Prisma.sql`t.deleted_at IS NULL`,
      Prisma.sql`t.type = 'TOPUP'::"CoinTransactionType"`,
    ];
    if (paymentMethodId) {
      conditions.push(Prisma.sql`t.payment_method_id = ${paymentMethodId}`);
    }
    if (startDate) {
      conditions.push(Prisma.sql`t.created_at >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(Prisma.sql`t.created_at <= ${endDate}`);
    }
    return Prisma.join(conditions, ' AND ');
  }

  /** Paginated row-per-transaction list (also used for CSV export when unpaged). */
  async getPaymentReportDetailed(filters: {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    paymentMethodId?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }) {
    const where = this.paymentReportWhere(filters);

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        t.id,
        t.created_at AS date,
        o.pg_order_id,
        u.name AS client_name,
        u.email AS client_email,
        t.amount AS coin_amount,
        o.coin_price,
        o.tax_amount,
        o.gateway_fee,
        o.price_paid,
        pm.name AS payment_method,
        t.payment_channel
      FROM coin_transactions t
      LEFT JOIN coin_orders o ON t.ref_id = o.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE ${where}
      ORDER BY t.created_at DESC
      ${filters.page && filters.limit ? Prisma.sql`LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}` : Prisma.empty}
    `;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(t.id)::bigint AS count
      FROM coin_transactions t
      WHERE ${where}
    `;

    return { data: rows, total: Number(countResult[0]?.count ?? 0) };
  }

  /** Totals grouped by payment method. */
  async getPaymentReportByMethod(filters: {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    paymentMethodId?: number | undefined;
  }) {
    const where = this.paymentReportWhere(filters);

    return this.prisma.$queryRaw<any[]>`
      SELECT
        t.payment_method_id,
        pm.name AS payment_method,
        COUNT(t.id)::int AS total_orders,
        SUM(o.coin_price)::numeric AS total_coin_price,
        SUM(o.tax_amount)::numeric AS total_tax_amount,
        SUM(o.gateway_fee)::numeric AS total_gateway_fee,
        SUM(o.price_paid)::numeric AS total_price_paid
      FROM coin_transactions t
      LEFT JOIN coin_orders o ON t.ref_id = o.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE ${where}
      GROUP BY t.payment_method_id, pm.name
      ORDER BY total_price_paid DESC NULLS LAST
    `;
  }

  /** Totals bucketed by day/week/month of the payment time. */
  async getPaymentReportChart(filters: {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    paymentMethodId?: number | undefined;
    interval?: 'day' | 'week' | 'month';
  }) {
    const where = this.paymentReportWhere(filters);
    const { interval = 'day' } = filters;

    let dateTrunc: Prisma.Sql;
    if (interval === 'month') {
      dateTrunc = Prisma.sql`DATE_TRUNC('month', t.created_at)`;
    } else if (interval === 'week') {
      dateTrunc = Prisma.sql`DATE_TRUNC('week', t.created_at)`;
    } else {
      dateTrunc = Prisma.sql`DATE(t.created_at)`;
    }

    return this.prisma.$queryRaw<any[]>`
      SELECT
        ${dateTrunc} AS date,
        COUNT(t.id)::int AS total_orders,
        SUM(o.coin_price)::numeric AS total_coin_price,
        SUM(o.tax_amount)::numeric AS total_tax_amount,
        SUM(o.gateway_fee)::numeric AS total_gateway_fee,
        SUM(o.price_paid)::numeric AS total_price_paid
      FROM coin_transactions t
      LEFT JOIN coin_orders o ON t.ref_id = o.id
      WHERE ${where}
      GROUP BY ${dateTrunc}
      ORDER BY ${dateTrunc} ASC
    `;
  }
}
