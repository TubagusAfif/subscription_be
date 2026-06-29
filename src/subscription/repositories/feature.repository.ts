import { PrismaClient, Prisma, SkuFeature } from '@prisma/client';

export class FeatureRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertFeatures(
    skuId: number,
    features: Array<any>,
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<SkuFeature[]> {
    if (!features || features.length === 0) return [];

    const db = tx || this.prisma;
    const results: SkuFeature[] = [];

    for (const feature of features) {
      const { id, ...rest } = feature;
      if (id) {
        const updated = await db.skuFeature.update({
          where: { id },
          data: { ...rest, sku_id: skuId, updated_by: adminId },
        });
        results.push(updated);
      } else {
        const created = await db.skuFeature.create({
          data: { ...rest, sku_id: skuId, created_by: adminId, updated_by: adminId },
        });
        results.push(created);
      }
    }
    return results;
  }

  async removeFeatures(
    skuId: number,
    featureIds: number[],
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!featureIds || featureIds.length === 0) return;

    const db = tx || this.prisma;
    await db.skuFeature.updateMany({
      where: { id: { in: featureIds }, sku_id: skuId },
      data: { is_active: false, deleted_at: new Date(), deleted_by: adminId },
    });
  }
}
