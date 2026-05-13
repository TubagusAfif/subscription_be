import { PrismaClient, Prisma, SkuBenefit } from '@prisma/client';

export class BenefitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertBenefits(
    skuId: number,
    benefits: Array<any>,
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<SkuBenefit[]> {
    if (!benefits || benefits.length === 0) return [];
    
    const db = tx || this.prisma;
    const results: SkuBenefit[] = [];

    for (const benefit of benefits) {
      const { id, ...rest } = benefit;
      if (id) {
        const updated = await db.skuBenefit.update({
          where: { id },
          data: { ...rest, sku_id: skuId, updated_by: adminId },
        });
        results.push(updated);
      } else {
        const created = await db.skuBenefit.create({
          data: { ...rest, sku_id: skuId, created_by: adminId, updated_by: adminId },
        });
        results.push(created);
      }
    }
    return results;
  }

  async removeBenefits(
    skuId: number,
    benefitIds: number[],
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!benefitIds || benefitIds.length === 0) return;

    const db = tx || this.prisma;
    await db.skuBenefit.updateMany({
      where: { id: { in: benefitIds }, sku_id: skuId },
      data: { deleted_at: new Date(), deleted_by: adminId },
    });
  }
}
