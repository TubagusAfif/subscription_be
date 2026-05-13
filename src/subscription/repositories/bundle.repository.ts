import { PrismaClient, Prisma, CoinBundle } from '@prisma/client';

export type CoinBundleWithRelations = Prisma.CoinBundleGetPayload<{
  include: { currency: true };
}>;

export class BundleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.CoinBundleCreateInput): Promise<CoinBundleWithRelations> {
    return this.prisma.coinBundle.create({
      data,
      include: { currency: true },
    });
  }

  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: CoinBundleWithRelations[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.CoinBundleWhereInput = {
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { bundle_name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.coinBundle.findMany({
        where,
        include: { currency: true },
        orderBy: { price: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.coinBundle.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number): Promise<CoinBundleWithRelations | null> {
    return this.prisma.coinBundle.findUnique({
      where: { id, deleted_at: null },
      include: { currency: true },
    });
  }

  async update(
    id: number,
    data: Prisma.CoinBundleUpdateInput,
  ): Promise<CoinBundleWithRelations> {
    return this.prisma.coinBundle.update({
      where: { id },
      data,
      include: { currency: true },
    });
  }

  async removeSoft(id: number, adminId: number): Promise<CoinBundleWithRelations> {
    return this.prisma.coinBundle.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        deleted_by: adminId,
      },
      include: { currency: true },
    });
  }
}
