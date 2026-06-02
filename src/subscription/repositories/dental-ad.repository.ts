import { PrismaClient, Prisma, DentalAd } from '@prisma/client';

export class DentalAdRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.DentalAdCreateInput): Promise<DentalAd> {
    return this.prisma.dentalAd.create({ data });
  }

  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: DentalAd[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.DentalAdWhereInput = {
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { category: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.dentalAd.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dentalAd.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number): Promise<DentalAd | null> {
    return this.prisma.dentalAd.findUnique({
      where: { id, deleted_at: null },
    });
  }

  async update(id: number, data: Prisma.DentalAdUpdateInput): Promise<DentalAd> {
    return this.prisma.dentalAd.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: number, adminId: number): Promise<DentalAd> {
    return this.prisma.dentalAd.update({
      where: { id },
      data: { deleted_at: new Date(), deleted_by: adminId },
    });
  }
}
