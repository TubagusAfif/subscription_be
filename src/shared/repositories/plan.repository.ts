import { PrismaClient, SkuBase, Prisma } from '@prisma/client';

export type PlanWithRelations = SkuBase & {
  benefits: Prisma.SkuBenefitGetPayload<{}>[];
  features: Prisma.SkuFeatureGetPayload<{}>[];
  addons: Prisma.SkuAddonGetPayload<{}>[];
};

export class SharedPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: PlanWithRelations[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const where: Prisma.SkuBaseWhereInput = search
      ? {
          OR: [
            { sku_name: { contains: search, mode: 'insensitive' } },
            { sku_code: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.skuBase.findMany({
        where: { ...where, deleted_at: null },
        include: {
          benefits: { where: { deleted_at: null } },
          features: { where: { deleted_at: null } },
          addons: { where: { deleted_at: null } },
        },
        orderBy: {
          rank: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.skuBase.count({ where: { ...where, deleted_at: null } }),
    ]);

    return {
      data: data as PlanWithRelations[],
      total,
    };
  }

  async findById(id: number): Promise<PlanWithRelations | null> {
    return this.prisma.skuBase.findFirst({
      where: { id, deleted_at: null },
      include: {
        benefits: { where: { deleted_at: null } },
        features: { where: { deleted_at: null } },
        addons: { where: { deleted_at: null } },
      },
    }) as Promise<PlanWithRelations | null>;
  }
}
