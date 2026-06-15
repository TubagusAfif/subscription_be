import { Router, RequestHandler } from 'express';
import { createClientAuthRouter } from './auth.routes';
import { ClientAuthController } from '../controllers/auth.controller';
import { CoinOrderController } from '../controllers/coin-order.controller';
import { CoinWalletController } from '../controllers/coin-wallet.controller';
import { ClientSubscriptionController } from '../controllers/subscription.controller';
import { SharedPlanController } from '../../shared/controllers/plan.controller';
import { SharedBundleController } from '../../shared/controllers/bundle.controller';
import { SharedCurrencyController } from '../../shared/controllers/currency.controller';
import { SharedTaxController } from '../../shared/controllers/tax.controller';
import { ClientAccountController } from '../controllers/account.controller';

import { createCoinOrderRouter } from './coin-order.routes';
import { createCoinWalletRouter } from './coin-wallet.routes';
import { createSubscriptionRouter } from './subscription.routes';
import { createClientPlanRouter } from './plan.routes';
import { createClientBundleRouter } from './bundle.routes';
import { createClientCurrencyRouter } from './currency.routes';
import { createClientDashboardRouter } from './dashboard.routes';
import { createClientTaxRouter } from './tax.routes';
import { createClientAccountRouter } from './account.routes';
import { ClientDashboardController } from '../controllers/dashboard.controller';

export const createClientRouter = (
  authController: ClientAuthController,
  coinOrderController: CoinOrderController,
  coinWalletController: CoinWalletController,
  subscriptionController: ClientSubscriptionController,
  dashboardController: ClientDashboardController,
  accountController: ClientAccountController,
  sharedPlanController: SharedPlanController,
  sharedBundleController: SharedBundleController,
  sharedCurrencyController: SharedCurrencyController,
  sharedTaxController: SharedTaxController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use('/auth', createClientAuthRouter(authController));
  router.use('/coin-orders', createCoinOrderRouter(coinOrderController, authenticate));
  router.use('/wallet', createCoinWalletRouter(coinWalletController, authenticate));
  router.use('/subscriptions', createSubscriptionRouter(subscriptionController, authenticate));
  router.use('/plans', createClientPlanRouter(sharedPlanController, authenticate));
  router.use('/bundles', createClientBundleRouter(sharedBundleController, authenticate));
  router.use('/currency', createClientCurrencyRouter(sharedCurrencyController, authenticate));
  router.use('/dashboard', createClientDashboardRouter(dashboardController, authenticate));
  router.use('/taxes', createClientTaxRouter(sharedTaxController, authenticate));
  router.use('/account', createClientAccountRouter(accountController, authenticate));

  return router;
};
