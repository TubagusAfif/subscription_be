import { Router, RequestHandler } from 'express';
import { SharedBundleController } from '../../shared/controllers/bundle.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';

export const createClientBundleRouter = (bundleController: SharedBundleController, authenticate: RequestHandler): Router => {
  const router = Router();

  router.use(authenticate, authorize(['OWNER']));

  router.get('/', bundleController.getActiveBundles);

  return router;
};
