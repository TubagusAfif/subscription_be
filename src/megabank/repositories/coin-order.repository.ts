import { CoinOrder, PrismaClient } from '@prisma/client';


export class CoinOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByPgOrderId(pgOrderId: string): Promise<CoinOrder | null> {
    return this.prisma.coinOrder.findUnique({
      where: { pg_order_id: pgOrderId, deleted_at: null },
      include: { bundle: true, currency: true, payment_method: true },
    });
  }

}