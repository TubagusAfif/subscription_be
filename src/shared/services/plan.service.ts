import { AppError } from '../middlewares/error.middleware';
import { SharedPlanRepository, PlanWithRelations } from '../repositories/plan.repository';
import { PaginatedResult } from '../types/pagination.types';
import { paginate } from '../utils/pagination.util';

export class SharedPlanService {
  constructor(private readonly sharedPlanRepository: SharedPlanRepository) {}

  async getAllPlans(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<PlanWithRelations>> {
    const { data, total } = await this.sharedPlanRepository.findAll(search, page, limit);
    return paginate(data, total, page, limit);
  }

  async getPlanById(id: number): Promise<PlanWithRelations> {
    const plan = await this.sharedPlanRepository.findById(id);
    if (!plan) {
      throw new AppError('PLAN_NOT_FOUND', `Plan with ID ${id} not found.`, 404);
    }
    return plan;
  }
}
