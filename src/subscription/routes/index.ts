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
import { SharedTaxController } from '../../shared/controllers/tax.controller';
import { createTaxRouter } from './tax.routes';
import { DentalAdController } from '../controllers/dental-ad.controller';
import { createDentalAdRouter } from './dental-ad.routes';
import { AdminDashboardController } from '../controllers/dashboard.controller';
import { createDashboardRouter } from './dashboard.routes';
import { PaymentMethodController } from '../controllers/payment-method.controller';
import { createPaymentMethodRouter } from './payment-method.routes';
import { ReportController } from '../controllers/report.controller';
import { createReportRouter } from './report.routes';

export const createSubscriptionRouter = (
  authController: SubscriptionAuthController,
  planController: PlanController,
  currencyController: CurrencyController,
  bundleController: BundleController,
  taxController: TaxController,
  sharedPlanController: SharedPlanController,
  sharedTaxController: SharedTaxController,
  dentalAdController: DentalAdController,
  dashboardController: AdminDashboardController,
  paymentMethodController: PaymentMethodController,
  reportController: ReportController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use('/auth', createSubscriptionAuthRouter(authController));
  router.use('/plans', createPlanRouter(planController, sharedPlanController, authenticate));
  router.use('/currencies', createCurrencyRouter(currencyController, authenticate));
  router.use('/bundles', createBundleRouter(bundleController, authenticate));
  router.use('/taxes', createTaxRouter(taxController, sharedTaxController, authenticate));
  router.use('/payment-methods', createPaymentMethodRouter(paymentMethodController, authenticate));
  router.use('/reports', createReportRouter(reportController, authenticate));
  router.use('/dental-ads', createDentalAdRouter(dentalAdController, authenticate));
  router.use('/dashboard', createDashboardRouter(dashboardController, authenticate));

  return router;
};
