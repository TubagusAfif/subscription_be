import { PrismaClient } from '@prisma/client';
import { ServicesContainer } from './services.container';

// --- Shared Controllers ---
import { SharedAuthController } from '../controllers/auth.controller';
import { UploadController } from '../controllers/upload.controller';
import { WebhookController as MegaBankWebhookController } from '../../megabank/controllers/webhook.controller';
import { MidtransWebhookController } from '../../midtrans/controllers/midtrans-webhook.controller';
import { AccountController } from '../controllers/account.controller';
import { SharedPlanController } from '../controllers/plan.controller';
import { SharedBundleController } from '../controllers/bundle.controller';
import { SharedCurrencyController } from '../controllers/currency.controller';
import { InternalController } from '../controllers/internal.controller';
import { SharedTaxController } from '../controllers/tax.controller';
import { SharedPaymentMethodController } from '../controllers/payment-method.controller';

// --- Client Controllers ---
import { ClientAuthController } from '../../client/controllers/auth.controller';
import { CoinOrderController } from '../../client/controllers/coin-order.controller';
import { CoinWalletController } from '../../client/controllers/coin-wallet.controller';
import { ClientSubscriptionController } from '../../client/controllers/subscription.controller';
import { ClientAccountController } from '../../client/controllers/account.controller';

// --- Subscription Controllers ---
import { SubscriptionAuthController } from '../../subscription/controllers/auth.controller';
import { PlanController } from '../../subscription/controllers/plan.controller';
import { CurrencyController } from '../../subscription/controllers/currency.controller';
import { BundleController } from '../../subscription/controllers/bundle.controller';
import { TaxController } from '../../subscription/controllers/tax.controller';
import { PaymentMethodController } from '../../subscription/controllers/payment-method.controller';
import { DentalAdController } from '../../subscription/controllers/dental-ad.controller';
import { AdminDashboardController } from '../../subscription/controllers/dashboard.controller';
import { ReportController } from '../../subscription/controllers/report.controller';
import { ClientDashboardController } from '../../client/controllers/dashboard.controller';

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

  private _megaBankWebhookController: MegaBankWebhookController | undefined;
  get megaBankWebhookController(): MegaBankWebhookController {
    if (!this._megaBankWebhookController) {
      this._megaBankWebhookController = new MegaBankWebhookController({
        webhookProcessorService: this.services.webhookProcessorService,
        megaBankPaymentService: this.services.megaBankPaymentService,
      });
    }
    return this._megaBankWebhookController;
  }

  private _midtransWebhookController: MidtransWebhookController | undefined;
  get midtransWebhookController(): MidtransWebhookController {
    if (!this._midtransWebhookController) {
      this._midtransWebhookController = new MidtransWebhookController({
        midtransWebhookProcessorService: this.services.midtransWebhookProcessorService,
        midtransPaymentService: this.services.midtransPaymentService,
      });
    }
    return this._midtransWebhookController;
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

  private _internalController: InternalController | undefined;
  get internalController(): InternalController {
    if (!this._internalController) {
      this._internalController = new InternalController(this.services.internalService);
    }
    return this._internalController;
  }

  private _sharedTaxController: SharedTaxController | undefined;
  get sharedTaxController(): SharedTaxController {
    if (!this._sharedTaxController) {
      this._sharedTaxController = new SharedTaxController({
        taxService: this.services.taxService,
      });
    }
    return this._sharedTaxController;
  }

  private _sharedPaymentMethodController: SharedPaymentMethodController | undefined;
  get sharedPaymentMethodController(): SharedPaymentMethodController {
    if (!this._sharedPaymentMethodController) {
      this._sharedPaymentMethodController = new SharedPaymentMethodController({
        paymentMethodService: this.services.paymentMethodService,
      });
    }
    return this._sharedPaymentMethodController;
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
        accountService: this.services.accountService,
        paymentGateway: this.services.paymentGateway,
        taxService: this.services.taxService,
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

  private _clientDashboardController: ClientDashboardController | undefined;
  get clientDashboardController(): ClientDashboardController {
    if (!this._clientDashboardController) {
      this._clientDashboardController = new ClientDashboardController({
        dashboardService: this.services.clientDashboardService,
      });
    }
    return this._clientDashboardController;
  }

  private _clientAccountController: ClientAccountController | undefined;
  get clientAccountController(): ClientAccountController {
    if (!this._clientAccountController) {
      this._clientAccountController = new ClientAccountController({
        accountService: this.services.clientAccountService,
      });
    }
    return this._clientAccountController;
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
        taxService: this.services.taxService,
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

  private _paymentMethodController: PaymentMethodController | undefined;
  get paymentMethodController(): PaymentMethodController {
    if (!this._paymentMethodController) {
      this._paymentMethodController = new PaymentMethodController({
        paymentMethodService: this.services.paymentMethodService,
      });
    }
    return this._paymentMethodController;
  }

  private _dentalAdController: DentalAdController | undefined;
  get dentalAdController(): DentalAdController {
    if (!this._dentalAdController) {
      this._dentalAdController = new DentalAdController(
        this.services.dentalAdService,
      );
    }
    return this._dentalAdController;
  }

  private _adminDashboardController: AdminDashboardController | undefined;
  get adminDashboardController(): AdminDashboardController {
    if (!this._adminDashboardController) {
      this._adminDashboardController = new AdminDashboardController({
        dashboardService: this.services.adminDashboardService,
      });
    }
    return this._adminDashboardController;
  }

  private _reportController: ReportController | undefined;
  get reportController(): ReportController {
    if (!this._reportController) {
      this._reportController = new ReportController({
        reportService: this.services.reportService,
      });
    }
    return this._reportController;
  }



  // ===========================================================================
  // Reset — clears all cached instances for test isolation
  // ===========================================================================

  reset(): void {
    this._sharedAuthController = undefined;
    this._uploadController = undefined;
    this._megaBankWebhookController = undefined;
    this._midtransWebhookController = undefined;
    this._accountController = undefined;
    this._clientAuthController = undefined;
    this._coinOrderController = undefined;
    this._coinWalletController = undefined;
    this._clientSubscriptionController = undefined;
    this._clientDashboardController = undefined;
    this._clientAccountController = undefined;
    this._subscriptionAuthController = undefined;
    this._planController = undefined;
    this._currencyController = undefined;
    this._bundleController = undefined;
    this._sharedTaxController = undefined;
    this._taxController = undefined;
    this._sharedPaymentMethodController = undefined;
    this._paymentMethodController = undefined;
    this._dentalAdController = undefined;
    this._adminDashboardController = undefined;
    this._reportController = undefined;
    this._internalController = undefined;
  }
}
