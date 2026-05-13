import { Router, RequestHandler } from 'express';
import { createSubscriptionAuthRouter } from './auth.routes';
import { createPlanRouter } from './plan.routes';
import { SubscriptionAuthController } from '../controllers/auth.controller';
import { PlanController } from '../controllers/plan.controller';
import { SharedPlanController } from '../../shared/controllers/plan.controller';
import { CurrencyController } from '../controllers/currency.controller';
import { createCurrencyRouter } from './currency.routes';
import { BundleController } from '../controllers/bundle.controller';
import { createBundleRouter } from './bundle.routes';
import { TaxController } from '../controllers/tax.controller';
import { createTaxRouter } from './tax.routes';
import { PaymentGatewayController } from '../controllers/payment-gateway.controller';
import { createPaymentGatewayRouter } from './payment-gateway.routes';


export const createSubscriptionRouter = (
  authController: SubscriptionAuthController,
  planController: PlanController,
  currencyController: CurrencyController,
  bundleController: BundleController,
  taxController: TaxController,
  paymentGatewayController: PaymentGatewayController,
  sharedPlanController: SharedPlanController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use('/auth', createSubscriptionAuthRouter(authController));
  router.use('/plans', createPlanRouter(planController, sharedPlanController, authenticate));
  router.use('/currencies', createCurrencyRouter(currencyController, authenticate));
  router.use('/bundles', createBundleRouter(bundleController, authenticate));
  router.use('/taxes', createTaxRouter(taxController, authenticate));
  router.use('/payment-gateways', createPaymentGatewayRouter(paymentGatewayController, authenticate));


  return router;
};
