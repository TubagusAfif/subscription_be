import { PrismaClient, Prisma, SkuAddon } from '@prisma/client';

export class AddonRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertAddons(
    skuId: number,
    addons: Array<any>,
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<SkuAddon[]> {
    if (!addons || addons.length === 0) return [];

    const db = tx || this.prisma;
    const results: SkuAddon[] = [];

    for (const addon of addons) {
      const { id, ...rest } = addon;
      if (id) {
        const updated = await db.skuAddon.update({
          where: { id },
          data: { ...rest, sku_id: skuId, updated_by: adminId },
        });
        results.push(updated);
      } else {
        const created = await db.skuAddon.create({
          data: { ...rest, sku_id: skuId, created_by: adminId, updated_by: adminId },
        });
        results.push(created);
      }
    }
    return results;
  }

  async removeAddons(
    skuId: number,
    addonIds: number[],
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!addonIds || addonIds.length === 0) return;

    const db = tx || this.prisma;
    await db.skuAddon.updateMany({
      where: { id: { in: addonIds }, sku_id: skuId },
      data: { deleted_at: new Date(), deleted_by: adminId },
    });
  }
}
