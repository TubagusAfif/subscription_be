import { Router, RequestHandler } from 'express';
import { AdminDashboardController } from '../controllers/dashboard.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';

export const createDashboardRouter = (
  dashboardController: AdminDashboardController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  // Dashboard endpoints require ADMIN role
  router.use(authenticate, authorize(['ADMIN', 'SUPERADMIN']));

  router.get('/', dashboardController.getDashboard);

  return router;
};
