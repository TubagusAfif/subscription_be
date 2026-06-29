import { Router, RequestHandler } from 'express';
import { BundleController } from '../controllers/bundle.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  createBundleSchema,
  updateBundleSchema,
  getBundleSchema,
  deleteBundleSchema,
} from '../../shared/validations/coin.validation';

export const createBundleRouter = (
  bundleController: BundleController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  // All bundle master data endpoints require ADMIN or OWNER roles
  router.use(authenticate, authorize(['ADMIN', 'SUPERADMIN']));

  router.post('/', validate(createBundleSchema), bundleController.createBundle);
  router.get('/', bundleController.getAllBundles);
  router.get('/:id', validate(getBundleSchema), bundleController.getBundleById);
  router.put('/:id', validate(updateBundleSchema), bundleController.updateBundle);
  router.delete('/:id', validate(deleteBundleSchema), bundleController.removeBundle);

  return router;
};
