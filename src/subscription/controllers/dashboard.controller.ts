import { Response, NextFunction } from 'express';
import { AdminDashboardService } from '../services/dashboard.service';
import { successResponse } from '../../shared/utils/response.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';

export interface AdminDashboardControllerDeps {
  dashboardService: AdminDashboardService;
}

export class AdminDashboardController {
  private readonly dashboardService: AdminDashboardService;

  constructor(deps: AdminDashboardControllerDeps) {
    this.dashboardService = deps.dashboardService;
  }

  getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await this.dashboardService.getDashboard(month, year, limit);
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

}
