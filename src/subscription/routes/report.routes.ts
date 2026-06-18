import { Router, RequestHandler } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';

export const createReportRouter = (
  reportController: ReportController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  // Report endpoints require ADMIN or OWNER roles
  router.use(authenticate, authorize(['ADMIN', 'SUPERADMIN', 'OWNER']));

  router.get('/transactions/chart', reportController.getChartReport);
  router.get('/transactions', reportController.getTransactionReport);

  return router;
};
