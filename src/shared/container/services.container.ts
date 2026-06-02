import { RepositoriesContainer } from './repositories.container';

// --- Shared Services ---
import { TokenService } from '../services/token.service';
import { MegaBankPaymentService } from '../services/external/mega-bank-payment.service';
import { AccountService } from '../services/account.service';
import { MailService } from '../services/mail.service';
import { SharedPlanService } from '../services/plan.service';

// --- Client Services ---
import { ClientAuthService } from '../../client/services/auth.service';
import { CoinOrderService } from '../../client/services/coin-order.service';
import { CoinWalletService } from '../../client/services/coin-wallet.service';
import { ClientSubscriptionService } from '../../client/services/subscription.service';

// --- Subscription Services ---
import { SubscriptionAuthService } from '../../subscription/services/auth.service';
import { PlanService } from '../../subscription/services/plan.service';
import { BenefitService } from '../../subscription/services/benefit.service';
import { FeatureService } from '../../subscription/services/feature.service';
import { AddonService } from '../../subscription/services/addon.service';
import { CurrencyService } from '../../subscription/services/currency.service';
import { BundleService } from '../../subscription/services/bundle.service';
import { TaxService } from '../../subscription/services/tax.service';
import { DentalAdService } from '../../subscription/services/dental-ad.service';
import { AdminDashboardService } from '../../subscription/services/dashboard.service';
import { ClientDashboardService } from '../../client/services/dashboard.service';

/**
 * Layer 2 — Services Container
 *
 * Manages all service instances using lazy initialization.
 * Receives the RepositoriesContainer via constructor injection to resolve
 * repository dependencies. Services are only created when first accessed.
 */
export class ServicesContainer {
  constructor(private repositories: RepositoriesContainer) {}

  // ===========================================================================
  // Shared Services
  // ===========================================================================

  private _tokenService: TokenService | undefined;
  get tokenService(): TokenService {
    if (!this._tokenService) {
      this._tokenService = new TokenService(this.repositories.refreshTokenRepository);
    }
    return this._tokenService;
  }

  private _megaBankPaymentService: MegaBankPaymentService | undefined;
  get megaBankPaymentService(): MegaBankPaymentService {
    if (!this._megaBankPaymentService) {
      this._megaBankPaymentService = new MegaBankPaymentService();
    }
    return this._megaBankPaymentService;
  }

  private _accountService: AccountService | undefined;
  get accountService(): AccountService {
    if (!this._accountService) {
      this._accountService = new AccountService(this.repositories.accountRepository);
    }
    return this._accountService;
  }

  private _mailService: MailService | undefined;
  get mailService(): MailService {
    if (!this._mailService) {
      this._mailService = new MailService();
    }
    return this._mailService;
  }

  // ===========================================================================
  // Client Services
  // ===========================================================================

  private _clientAuthService: ClientAuthService | undefined;
  get clientAuthService(): ClientAuthService {
    if (!this._clientAuthService) {
      this._clientAuthService = new ClientAuthService({
        userRepository: this.repositories.userRepository,
        mailService: this.mailService,
        prisma: this.repositories.prisma,
      });
    }
    return this._clientAuthService;
  }

  private _coinWalletService: CoinWalletService | undefined;
  get coinWalletService(): CoinWalletService {
    if (!this._coinWalletService) {
      this._coinWalletService = new CoinWalletService({
        coinWalletRepository: this.repositories.coinWalletRepository,
        coinTransactionRepository: this.repositories.coinTransactionRepository,
      });
    }
    return this._coinWalletService;
  }

  private _coinOrderService: CoinOrderService | undefined;
  get coinOrderService(): CoinOrderService {
    if (!this._coinOrderService) {
      this._coinOrderService = new CoinOrderService({
        coinOrderRepository: this.repositories.coinOrderRepository,
        coinWalletRepository: this.repositories.coinWalletRepository,
        coinTransactionRepository: this.repositories.coinTransactionRepository,
        bundleRepository: this.repositories.bundleRepository,
        megaBankPaymentService: this.megaBankPaymentService,
        prisma: this.repositories.prisma,
      });
    }
    return this._coinOrderService;
  }

  private _clientSubscriptionService: ClientSubscriptionService | undefined;
  get clientSubscriptionService(): ClientSubscriptionService {
    if (!this._clientSubscriptionService) {
      this._clientSubscriptionService = new ClientSubscriptionService({
        subscriptionRepository: this.repositories.clientSubscriptionRepository,
        coinWalletService: this.coinWalletService,
        planRepository: this.repositories.sharedPlanRepository,
      });
    }
    return this._clientSubscriptionService;
  }

  private _clientDashboardService: ClientDashboardService | undefined;
  get clientDashboardService(): ClientDashboardService {
    if (!this._clientDashboardService) {
      this._clientDashboardService = new ClientDashboardService({
        userRepository: this.repositories.userRepository,
        clientSubscriptionRepository: this.repositories.clientSubscriptionRepository,
        coinWalletRepository: this.repositories.coinWalletRepository,
        coinTransactionRepository: this.repositories.coinTransactionRepository,
        orderRepository: this.repositories.orderRepository,
        billingCycleRepository: this.repositories.billingCycleRepository,
      });
    }
    return this._clientDashboardService;
  }



  private _sharedPlanService: SharedPlanService | undefined;
  get sharedPlanService(): SharedPlanService {
    if (!this._sharedPlanService) {
      this._sharedPlanService = new SharedPlanService(this.repositories.sharedPlanRepository);
    }
    return this._sharedPlanService;
  }

  // ===========================================================================
  // Subscription Services
  // ===========================================================================

  private _subscriptionAuthService: SubscriptionAuthService | undefined;
  get subscriptionAuthService(): SubscriptionAuthService {
    if (!this._subscriptionAuthService) {
      this._subscriptionAuthService = new SubscriptionAuthService(
        this.repositories.userRepository,
      );
    }
    return this._subscriptionAuthService;
  }

  private _planService: PlanService | undefined;
  get planService(): PlanService {
    if (!this._planService) {
      this._planService = new PlanService(
        this.repositories.planRepository,
        this.sharedPlanService
      );
    }
    return this._planService;
  }

  private _benefitService: BenefitService | undefined;
  get benefitService(): BenefitService {
    if (!this._benefitService) {
      this._benefitService = new BenefitService(this.repositories.benefitRepository);
    }
    return this._benefitService;
  }

  private _featureService: FeatureService | undefined;
  get featureService(): FeatureService {
    if (!this._featureService) {
      this._featureService = new FeatureService(this.repositories.featureRepository);
    }
    return this._featureService;
  }

  private _addonService: AddonService | undefined;
  get addonService(): AddonService {
    if (!this._addonService) {
      this._addonService = new AddonService(this.repositories.addonRepository);
    }
    return this._addonService;
  }

  private _currencyService: CurrencyService | undefined;
  get currencyService(): CurrencyService {
    if (!this._currencyService) {
      this._currencyService = new CurrencyService(this.repositories.currencyRepository);
    }
    return this._currencyService;
  }

  private _bundleService: BundleService | undefined;
  get bundleService(): BundleService {
    if (!this._bundleService) {
      this._bundleService = new BundleService({
        bundleRepository: this.repositories.bundleRepository,
        currencyService: this.currencyService,
      });
    }
    return this._bundleService;
  }

  private _taxService: TaxService | undefined;
  get taxService(): TaxService {
    if (!this._taxService) {
      this._taxService = new TaxService(this.repositories.taxRepository);
    }
    return this._taxService;
  }

  private _dentalAdService: DentalAdService | undefined;
  get dentalAdService(): DentalAdService {
    if (!this._dentalAdService) {
      this._dentalAdService = new DentalAdService(
        this.repositories.dentalAdRepository,
      );
    }
    return this._dentalAdService;
  }

  private _adminDashboardService: AdminDashboardService | undefined;
  get adminDashboardService(): AdminDashboardService {
    if (!this._adminDashboardService) {
      this._adminDashboardService = new AdminDashboardService({
        userRepository: this.repositories.userRepository,
        subscriptionRepository: this.repositories.adminSubscriptionRepository,
        coinTransactionRepository: this.repositories.coinTransactionRepository,
        coinOrderRepository: this.repositories.coinOrderRepository,
        planSwitchRepository: this.repositories.planSwitchRepository,
      });
    }
    return this._adminDashboardService;
  }



  // ===========================================================================
  // Reset — clears all cached instances for test isolation
  // ===========================================================================

  reset(): void {
    this._tokenService = undefined;
    this._megaBankPaymentService = undefined;
    this._accountService = undefined;
    this._mailService = undefined;
    this._clientAuthService = undefined;
    this._coinWalletService = undefined;
    this._coinOrderService = undefined;
    this._clientSubscriptionService = undefined;
    this._clientDashboardService = undefined;
    this._dentalAdService = undefined;
    this._adminDashboardService = undefined;
  }
}
