import { Router, RequestHandler } from 'express';
import { SharedPlanController } from '../../shared/controllers/plan.controller';

export const createClientPlanRouter = (
  sharedPlanController: SharedPlanController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  // Client plan endpoints (viewing active plans)
  router.use(authenticate);

  router.get('/', sharedPlanController.getAllPlans);
  router.get('/:id', sharedPlanController.getPlanById);

  return router;
};
