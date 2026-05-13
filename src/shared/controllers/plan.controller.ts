import { Response, NextFunction } from 'express';
import { SharedPlanService } from '../services/plan.service';
import { successResponse } from '../utils/response.util';
import { PlanMapper } from '../mappers/plan.mapper';
import type { AuthenticatedRequest } from '../types/typed-request';

export class SharedPlanController {
  constructor(private readonly planService: SharedPlanService) {}

  getAllPlans = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const { data, meta } = await this.planService.getAllPlans(search, page, limit);
      res.status(200).json(successResponse(PlanMapper.toListResponse(data), meta));
    } catch (error) {
      next(error);
    }
  };

  getPlanById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plan = await this.planService.getPlanById(Number(req.params.id));
      res.status(200).json(successResponse(PlanMapper.toResponse(plan)));
    } catch (error) {
      next(error);
    }
  };
}
