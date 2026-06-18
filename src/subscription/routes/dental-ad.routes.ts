import { Router, RequestHandler } from 'express';
import { DentalAdController } from '../controllers/dental-ad.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';

export const createDentalAdRouter = (
  dentalAdController: DentalAdController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  // All dental ad endpoints require authentication and ADMIN or OWNER roles for now
  router.use(authenticate, authorize(['ADMIN', 'SUPERADMIN', 'OWNER']));

  router.post('/', dentalAdController.create);
  router.get('/', dentalAdController.findAll);
  router.get('/:id', dentalAdController.findById);
  router.put('/:id', dentalAdController.update);
  router.delete('/:id', dentalAdController.remove);

  return router;
};
