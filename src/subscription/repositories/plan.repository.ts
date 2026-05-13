import { PrismaClient, SkuBase, Prisma } from '@prisma/client';
import type { UpsertPlanBody } from '../../shared/validations/plan.validation';

export class PlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async deactivate(id: number, updatedBy: number): Promise<SkuBase> {
    return this.prisma.skuBase.update({
      where: { id },
      data: {
        is_active: false,
        updated_by: updatedBy,
        deleted_at: new Date(),
        deleted_by: updatedBy,
      },
    });
  }

  async upsertPlan(
    data: Omit<UpsertPlanBody, 'benefits' | 'features' | 'addons' | 'removed'>,
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<SkuBase> {
    const db = tx || this.prisma;
    const { id: planId, ...restData } = data;

    if (planId) {
      return db.skuBase.update({
        where: { id: planId },
        data: {
          ...(restData as any),
          updated_by: adminId,
        },
      });
    } else {
      return db.skuBase.create({
        data: {
          ...(restData as any),
          created_by: adminId,
          updated_by: adminId,
        },
      });
    }
  }
}
