import { AppError } from '../../shared/middlewares/error.middleware';
import { PlanRepository } from '../repositories/plan.repository';
import { SharedPlanService } from '../../shared/services/plan.service';
import type { UpsertPlanBody } from '../../shared/validations/plan.validation';
import { Prisma, SkuBase } from '@prisma/client';

export class PlanService {
  constructor(
    private readonly planRepository: PlanRepository,
    private readonly sharedPlanService: SharedPlanService,
  ) {}

  async upsertPlanBase(
    data: Omit<UpsertPlanBody, 'benefits' | 'features' | 'addons' | 'removed'>,
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<SkuBase> {
    if (data.id) {
      await this.sharedPlanService.getPlanById(data.id);
    }

    try {
      return await this.planRepository.upsertPlan(data, adminId, tx);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('DUPLICATE_SKU', 'A SKU with this code already exists.', 409);
      }
      throw error;
    }
  }

  async deactivatePlan(id: number, adminId: number): Promise<void> {
    await this.sharedPlanService.getPlanById(id);
    await this.planRepository.deactivate(id, adminId);
  }
}
