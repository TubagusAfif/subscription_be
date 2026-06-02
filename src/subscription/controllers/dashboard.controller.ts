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
      const result = await this.dashboardService.getDashboard();
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

}
