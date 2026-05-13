import { PrismaClient } from '@prisma/client';
import { ServicesContainer } from './services.container';

// --- Shared Controllers ---
import { SharedAuthController } from '../controllers/auth.controller';
import { UploadController } from '../controllers/upload.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { AccountController } from '../controllers/account.controller';
import { SharedPlanController } from '../controllers/plan.controller';
import { SharedBundleController } from '../controllers/bundle.controller';
import { SharedCurrencyController } from '../controllers/currency.controller';

// --- Client Controllers ---
import { ClientAuthController } from '../../client/controllers/auth.controller';
import { CoinOrderController } from '../../client/controllers/coin-order.controller';
import { CoinWalletController } from '../../client/controllers/coin-wallet.controller';
import { ClientSubscriptionController } from '../../client/controllers/subscription.controller';

// --- Subscription Controllers ---
import { SubscriptionAuthController } from '../../subscription/controllers/auth.controller';
import { PlanController } from '../../subscription/controllers/plan.controller';
import { CurrencyController } from '../../subscription/controllers/currency.controller';
import { BundleController } from '../../subscription/controllers/bundle.controller';
import { TaxController } from '../../subscription/controllers/tax.controller';
import { PaymentGatewayController } from '../../subscription/controllers/payment-gateway.controller';

/**
 * Layer 3 — Controllers Container
 *
 * Manages all controller instances using lazy initialization.
 * Receives the ServicesContainer and PrismaClient via constructor injection
 * to resolve service dependencies. Controllers are only created when first accessed.
 */
export class ControllersContainer {
  constructor(
    private services: ServicesContainer,
    private prisma: PrismaClient,
  ) {}

  // ===========================================================================
  // Shared Controllers
  // ===========================================================================

  private _sharedAuthController: SharedAuthController | undefined;
  get sharedAuthController(): SharedAuthController {
    if (!this._sharedAuthController) {
      this._sharedAuthController = new SharedAuthController({
        tokenService: this.services.tokenService,
      });
    }
    return this._sharedAuthController;
  }

  private _uploadController: UploadController | undefined;
  get uploadController(): UploadController {
    if (!this._uploadController) {
      this._uploadController = new UploadController();
    }
    return this._uploadController;
  }

  private _webhookController: WebhookController | undefined;
  get webhookController(): WebhookController {
    if (!this._webhookController) {
      this._webhookController = new WebhookController({
        coinOrderService: this.services.coinOrderService,
        mpgService: this.services.mpgService,
      });
    }
    return this._webhookController;
  }

  private _accountController: AccountController | undefined;
  get accountController(): AccountController {
    if (!this._accountController) {
      this._accountController = new AccountController({
        accountService: this.services.accountService,
      });
    }
    return this._accountController;
  }

  // ===========================================================================
  // Client Controllers
  // ===========================================================================

  private _sharedPlanController: SharedPlanController | undefined;
  get sharedPlanController(): SharedPlanController {
    if (!this._sharedPlanController) {
      this._sharedPlanController = new SharedPlanController(
        this.services.sharedPlanService
      );
    }
    return this._sharedPlanController;
  }

  private _sharedBundleController: SharedBundleController | undefined;
  get sharedBundleController(): SharedBundleController {
    if (!this._sharedBundleController) {
      this._sharedBundleController = new SharedBundleController(
        this.services.bundleService
      );
    }
    return this._sharedBundleController;
  }

  private _sharedCurrencyController: SharedCurrencyController | undefined;
  get sharedCurrencyController(): SharedCurrencyController {
    if (!this._sharedCurrencyController) {
      this._sharedCurrencyController = new SharedCurrencyController(
        this.services.currencyService
      );
    }
    return this._sharedCurrencyController;
  }

  private _clientAuthController: ClientAuthController | undefined;
  get clientAuthController(): ClientAuthController {
    if (!this._clientAuthController) {
      this._clientAuthController = new ClientAuthController({
        clientAuthService: this.services.clientAuthService,
        tokenService: this.services.tokenService,
      });
    }
    return this._clientAuthController;
  }

  private _coinOrderController: CoinOrderController | undefined;
  get coinOrderController(): CoinOrderController {
    if (!this._coinOrderController) {
      this._coinOrderController = new CoinOrderController({
        coinOrderService: this.services.coinOrderService,
      });
    }
    return this._coinOrderController;
  }

  private _coinWalletController: CoinWalletController | undefined;
  get coinWalletController(): CoinWalletController {
    if (!this._coinWalletController) {
      this._coinWalletController = new CoinWalletController({
        coinWalletService: this.services.coinWalletService,
      });
    }
    return this._coinWalletController;
  }

  private _clientSubscriptionController: ClientSubscriptionController | undefined;
  get clientSubscriptionController(): ClientSubscriptionController {
    if (!this._clientSubscriptionController) {
      this._clientSubscriptionController = new ClientSubscriptionController({
        subscriptionService: this.services.clientSubscriptionService,
      });
    }
    return this._clientSubscriptionController;
  }



  // ===========================================================================
  // Subscription Controllers
  // ===========================================================================

  private _subscriptionAuthController: SubscriptionAuthController | undefined;
  get subscriptionAuthController(): SubscriptionAuthController {
    if (!this._subscriptionAuthController) {
      this._subscriptionAuthController = new SubscriptionAuthController({
        subscriptionAuthService: this.services.subscriptionAuthService,
        tokenService: this.services.tokenService,
      });
    }
    return this._subscriptionAuthController;
  }

  private _planController: PlanController | undefined;
  get planController(): PlanController {
    if (!this._planController) {
      this._planController = new PlanController(
        this.prisma,
        this.services.planService,
        this.services.benefitService,
        this.services.featureService,
        this.services.addonService,
      );
    }
    return this._planController;
  }

  private _currencyController: CurrencyController | undefined;
  get currencyController(): CurrencyController {
    if (!this._currencyController) {
      this._currencyController = new CurrencyController({
        currencyService: this.services.currencyService,
      });
    }
    return this._currencyController;
  }

  private _bundleController: BundleController | undefined;
  get bundleController(): BundleController {
    if (!this._bundleController) {
      this._bundleController = new BundleController({
        bundleService: this.services.bundleService,
        currencyService: this.services.currencyService,
      });
    }
    return this._bundleController;
  }

  private _taxController: TaxController | undefined;
  get taxController(): TaxController {
    if (!this._taxController) {
      this._taxController = new TaxController({
        taxService: this.services.taxService,
      });
    }
    return this._taxController;
  }

  private _gatewayController: PaymentGatewayController | undefined;
  get gatewayController(): PaymentGatewayController {
    if (!this._gatewayController) {
      this._gatewayController = new PaymentGatewayController({
        gatewayService: this.services.gatewayService,
      });
    }
    return this._gatewayController;
  }



  // ===========================================================================
  // Reset — clears all cached instances for test isolation
  // ===========================================================================

  reset(): void {
    this._sharedAuthController = undefined;
    this._uploadController = undefined;
    this._webhookController = undefined;
    this._accountController = undefined;
    this._clientAuthController = undefined;
    this._coinOrderController = undefined;
    this._coinWalletController = undefined;
    this._clientSubscriptionController = undefined;
    this._subscriptionAuthController = undefined;
    this._planController = undefined;
    this._currencyController = undefined;
    this._bundleController = undefined;
    this._taxController = undefined;
    this._gatewayController = undefined;

  }
}
