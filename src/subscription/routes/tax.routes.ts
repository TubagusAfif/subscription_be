import { Router, RequestHandler } from 'express';
import { TaxController } from '../controllers/tax.controller';
import { SharedTaxController } from '../../shared/controllers/tax.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  createTaxSchema,
  updateTaxSchema,
  getTaxSchema,
  deleteTaxSchema,
  activateTaxSchema,
} from '../../shared/validations/tax.validation';

export const createTaxRouter = (
  taxController: TaxController,
  sharedTaxController: SharedTaxController,
  authenticate: RequestHandler
): Router => {
  const router = Router();

  // All tax master data endpoints require ADMIN or OWNER roles
  router.use(authenticate, authorize(['ADMIN', 'OWNER']));

  router.post('/', validate(createTaxSchema), taxController.createTax);
  router.get('/', taxController.getAllTaxes);
  router.get('/active', sharedTaxController.getActiveTax);
  router.get('/:id', validate(getTaxSchema), taxController.getTaxById);
  router.put('/:id', validate(updateTaxSchema), taxController.updateTax);
  
  // Only OWNER can delete
  router.delete('/:id', authorize(['OWNER']), validate(deleteTaxSchema), taxController.removeTax);
  
  router.patch('/:id/activate', validate(activateTaxSchema), taxController.activateTax);

  return router;
};
