import { PrismaClient, Prisma, TaxConfig } from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for managing Tax Configurations.
---------------------------------------------------------------
**/
export class TaxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTax(data: Prisma.TaxConfigCreateInput): Promise<TaxConfig> {
    return this.prisma.$transaction(async (tx) => {
      // Enforce exclusive active: deactivate all others when creating an active tax
      if (data.is_active !== false) {
        await tx.taxConfig.updateMany({
          where: { deleted_at: null, is_active: true },
          data: { is_active: false, updated_by: data.updated_by as number },
        });
      }
      return tx.taxConfig.create({ data });
    });
  }

  async findAllTaxes(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: TaxConfig[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.TaxConfigWhereInput = {
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { tax_name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.taxConfig.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.taxConfig.count({ where }),
    ]);

    return { data, total };
  }

  async findActiveTax(): Promise<TaxConfig | null> {
    return this.prisma.taxConfig.findFirst({
      where: { deleted_at: null, is_active: true },
    });
  }

  async findTaxById(id: number): Promise<TaxConfig | null> {
    return this.prisma.taxConfig.findUnique({
      where: { id, deleted_at: null },
    });
  }

  async updateTax(id: number, data: Prisma.TaxConfigUpdateInput): Promise<TaxConfig> {
    return this.prisma.$transaction(async (tx) => {
      // Enforce exclusive active: deactivate all others when setting a tax to active
      if (data.is_active === true) {
        await tx.taxConfig.updateMany({
          where: { deleted_at: null, is_active: true, id: { not: id } },
          data: { is_active: false, updated_by: data.updated_by as number },
        });
      }
      return tx.taxConfig.update({
        where: { id },
        data,
      });
    });
  }

  async deactivateAll(adminId: number): Promise<void> {
    await this.prisma.taxConfig.updateMany({
      where: { deleted_at: null, is_active: true },
      data: { is_active: false, updated_by: adminId },
    });
  }

  async activateTax(id: number, adminId: number): Promise<TaxConfig> {
    return this.prisma.$transaction(async (tx) => {
      await tx.taxConfig.updateMany({
        where: { deleted_at: null, is_active: true },
        data: { is_active: false, updated_by: adminId },
      });
      return tx.taxConfig.update({
        where: { id },
        data: { is_active: true, updated_by: adminId },
      });
    });
  }

  // Soft delete
  async removeTax(id: number, adminId: number): Promise<TaxConfig> {
    return this.prisma.taxConfig.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        deleted_by: adminId,
      },
    });
  }
}
