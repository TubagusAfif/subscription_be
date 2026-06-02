import { Response, NextFunction } from 'express';
import { ClientDashboardService } from '../services/dashboard.service';
import { successResponse } from '../../shared/utils/response.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';

export interface ClientDashboardControllerDeps {
  dashboardService: ClientDashboardService;
}

export class ClientDashboardController {
  private readonly dashboardService: ClientDashboardService;

  constructor(deps: ClientDashboardControllerDeps) {
    this.dashboardService = deps.dashboardService;
  }

  getDashboard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = Number(req.user.sub);
      const dashboard = await this.dashboardService.getDashboard(userId);
      res.status(200).json(successResponse(dashboard));
    } catch (error) {
      next(error);
    }
  };
}
