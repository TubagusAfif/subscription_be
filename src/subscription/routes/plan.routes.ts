import { Router, RequestHandler } from 'express';
import { PlanController } from '../controllers/plan.controller';
import { SharedPlanController } from '../../shared/controllers/plan.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  upsertPlanSchema,
  deactivatePlanSchema,
} from '../../shared/validations/plan.validation';

export const createPlanRouter = (
  planController: PlanController,
  sharedPlanController: SharedPlanController,
  authenticate: RequestHandler
): Router => {
  const router = Router();

  // All plan endpoints require at least ADMIN role
  router.use(authenticate, authorize(['ADMIN', 'SUPERADMIN']));

  router.post('/', validate(upsertPlanSchema), planController.upsertPlan);
  router.get('/', sharedPlanController.getAllPlans);
  router.get('/:id', sharedPlanController.getPlanById);

  // Deactivate requires OWNER role (equivalent to SUPER_ADMIN per SPEC)
  router.delete('/:id', validate(deactivatePlanSchema), planController.deactivatePlan);

  return router;
};
