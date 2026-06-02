import { Router, RequestHandler } from 'express';
import { ClientDashboardController } from '../controllers/dashboard.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';

export const createClientDashboardRouter = (
  dashboardController: ClientDashboardController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use(authenticate, authorize(['OWNER']));

  // GET /api/v1/client/dashboard — client dashboard summary
  router.get('/', dashboardController.getDashboard);

  return router;
};
