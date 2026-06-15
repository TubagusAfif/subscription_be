import { PrismaClient } from '@prisma/client';

// --- Shared Repositories ---
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { AccountRepository } from '../repositories/account.repository';
import { SharedPlanRepository } from '../repositories/plan.repository';
import { OrderRepository } from '../repositories/order.repository';
import { BillingCycleRepository } from '../repositories/billing-cycle.repository';
import { PlanSwitchRepository } from '../repositories/plan-switch.repository';
import { WebhookOutboxRepository } from '../repositories/webhook-outbox.repository';
import { InternalRepository } from '../repositories/internal.repository';
import { TaxRepository } from '../repositories/tax.repository';

// --- Client Repositories ---
import { CoinOrderRepository } from '../../client/repositories/coin-order.repository';
import { CoinWalletRepository } from '../../client/repositories/coin-wallet.repository';
import { CoinTransactionRepository } from '../../client/repositories/coin-transaction.repository';
import { ClientSubscriptionRepository } from '../../client/repositories/subscription.repository';
import { ClientAccountRepository } from '../../client/repositories/account.repository';

// --- Subscription Repositories ---
import { PlanRepository } from '../../subscription/repositories/plan.repository';
import { BenefitRepository } from '../../subscription/repositories/benefit.repository';
import { FeatureRepository } from '../../subscription/repositories/feature.repository';
import { AddonRepository } from '../../subscription/repositories/addon.repository';
import { CurrencyRepository } from '../../subscription/repositories/currency.repository';
import { BundleRepository } from '../../subscription/repositories/bundle.repository';
import { DentalAdRepository } from '../../subscription/repositories/dental-ad.repository';
import { AdminSubscriptionRepository } from '../../subscription/repositories/subscription.repository';

/**
 * Layer 1 — Repository Container
 *
 * Manages all repository instances using lazy initialization.
 * Repositories are only created when first accessed, then cached for subsequent use.
 * Each repository receives the shared PrismaClient via constructor injection.
 */
export class RepositoriesContainer {
  constructor(public readonly prisma: PrismaClient) {}

  // ===========================================================================
  // Shared Repositories
  // ===========================================================================

  private _userRepository: UserRepository | undefined;
  get userRepository(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new UserRepository(this.prisma);
    }
    return this._userRepository;
  }

  private _refreshTokenRepository: RefreshTokenRepository | undefined;
  get refreshTokenRepository(): RefreshTokenRepository {
    if (!this._refreshTokenRepository) {
      this._refreshTokenRepository = new RefreshTokenRepository(this.prisma);
    }
    return this._refreshTokenRepository;
  }

  private _accountRepository: AccountRepository | undefined;
  get accountRepository(): AccountRepository {
    if (!this._accountRepository) {
      this._accountRepository = new AccountRepository(this.prisma);
    }
    return this._accountRepository;
  }

  private _sharedPlanRepository: SharedPlanRepository | undefined;
  get sharedPlanRepository(): SharedPlanRepository {
    if (!this._sharedPlanRepository) {
      this._sharedPlanRepository = new SharedPlanRepository(this.prisma);
    }
    return this._sharedPlanRepository;
  }

  private _orderRepository: OrderRepository | undefined;
  get orderRepository(): OrderRepository {
    if (!this._orderRepository) {
      this._orderRepository = new OrderRepository(this.prisma);
    }
    return this._orderRepository;
  }

  private _billingCycleRepository: BillingCycleRepository | undefined;
  get billingCycleRepository(): BillingCycleRepository {
    if (!this._billingCycleRepository) {
      this._billingCycleRepository = new BillingCycleRepository(this.prisma);
    }
    return this._billingCycleRepository;
  }

  private _planSwitchRepository: PlanSwitchRepository | undefined;
  get planSwitchRepository(): PlanSwitchRepository {
    if (!this._planSwitchRepository) {
      this._planSwitchRepository = new PlanSwitchRepository(this.prisma);
    }
    return this._planSwitchRepository;
  }

  private _webhookOutboxRepository: WebhookOutboxRepository | undefined;
  get webhookOutboxRepository(): WebhookOutboxRepository {
    if (!this._webhookOutboxRepository) {
      this._webhookOutboxRepository = new WebhookOutboxRepository(this.prisma);
    }
    return this._webhookOutboxRepository;
  }

  private _internalRepository: InternalRepository | undefined;
  get internalRepository(): InternalRepository {
    if (!this._internalRepository) {
      this._internalRepository = new InternalRepository(this.prisma);
    }
    return this._internalRepository;
  }

  private _taxRepository: TaxRepository | undefined;
  get taxRepository(): TaxRepository {
    if (!this._taxRepository) {
      this._taxRepository = new TaxRepository(this.prisma);
    }
    return this._taxRepository;
  }

  // ===========================================================================
  // Client Repositories
  // ===========================================================================

  private _coinOrderRepository: CoinOrderRepository | undefined;
  get coinOrderRepository(): CoinOrderRepository {
    if (!this._coinOrderRepository) {
      this._coinOrderRepository = new CoinOrderRepository(this.prisma);
    }
    return this._coinOrderRepository;
  }

  private _coinWalletRepository: CoinWalletRepository | undefined;
  get coinWalletRepository(): CoinWalletRepository {
    if (!this._coinWalletRepository) {
      this._coinWalletRepository = new CoinWalletRepository(this.prisma);
    }
    return this._coinWalletRepository;
  }

  private _coinTransactionRepository: CoinTransactionRepository | undefined;
  get coinTransactionRepository(): CoinTransactionRepository {
    if (!this._coinTransactionRepository) {
      this._coinTransactionRepository = new CoinTransactionRepository(this.prisma);
    }
    return this._coinTransactionRepository;
  }

  private _clientSubscriptionRepository: ClientSubscriptionRepository | undefined;
  get clientSubscriptionRepository(): ClientSubscriptionRepository {
    if (!this._clientSubscriptionRepository) {
      this._clientSubscriptionRepository = new ClientSubscriptionRepository(this.prisma);
    }
    return this._clientSubscriptionRepository;
  }

  private _clientAccountRepository: ClientAccountRepository | undefined;
  get clientAccountRepository(): ClientAccountRepository {
    if (!this._clientAccountRepository) {
      this._clientAccountRepository = new ClientAccountRepository(this.prisma);
    }
    return this._clientAccountRepository;
  }


  // ===========================================================================
  // Subscription Repositories
  // ===========================================================================

  private _planRepository: PlanRepository | undefined;
  get planRepository(): PlanRepository {
    if (!this._planRepository) {
      this._planRepository = new PlanRepository(this.prisma);
    }
    return this._planRepository;
  }

  private _benefitRepository: BenefitRepository | undefined;
  get benefitRepository(): BenefitRepository {
    if (!this._benefitRepository) {
      this._benefitRepository = new BenefitRepository(this.prisma);
    }
    return this._benefitRepository;
  }

  private _featureRepository: FeatureRepository | undefined;
  get featureRepository(): FeatureRepository {
    if (!this._featureRepository) {
      this._featureRepository = new FeatureRepository(this.prisma);
    }
    return this._featureRepository;
  }

  private _addonRepository: AddonRepository | undefined;
  get addonRepository(): AddonRepository {
    if (!this._addonRepository) {
      this._addonRepository = new AddonRepository(this.prisma);
    }
    return this._addonRepository;
  }

  private _currencyRepository: CurrencyRepository | undefined;
  get currencyRepository(): CurrencyRepository {
    if (!this._currencyRepository) {
      this._currencyRepository = new CurrencyRepository(this.prisma);
    }
    return this._currencyRepository;
  }

  private _bundleRepository: BundleRepository | undefined;
  get bundleRepository(): BundleRepository {
    if (!this._bundleRepository) {
      this._bundleRepository = new BundleRepository(this.prisma);
    }
    return this._bundleRepository;
  }


  private _dentalAdRepository: DentalAdRepository | undefined;
  get dentalAdRepository(): DentalAdRepository {
    if (!this._dentalAdRepository) {
      this._dentalAdRepository = new DentalAdRepository(this.prisma);
    }
    return this._dentalAdRepository;
  }

  private _adminSubscriptionRepository: AdminSubscriptionRepository | undefined;
  get adminSubscriptionRepository(): AdminSubscriptionRepository {
    if (!this._adminSubscriptionRepository) {
      this._adminSubscriptionRepository = new AdminSubscriptionRepository(this.prisma);
    }
    return this._adminSubscriptionRepository;
  }


  // ===========================================================================
  // Reset — clears all cached instances for test isolation
  // ===========================================================================

  reset(): void {
    this._userRepository = undefined;
    this._refreshTokenRepository = undefined;
    this._accountRepository = undefined;
    this._sharedPlanRepository = undefined;
    this._orderRepository = undefined;
    this._billingCycleRepository = undefined;
    this._planSwitchRepository = undefined;
    this._webhookOutboxRepository = undefined;
    this._internalRepository = undefined;
    this._coinOrderRepository = undefined;
    this._coinWalletRepository = undefined;
    this._coinTransactionRepository = undefined;
    this._clientSubscriptionRepository = undefined;
    this._clientAccountRepository = undefined;
    this._dentalAdRepository = undefined;
    this._adminSubscriptionRepository = undefined;
  }
}
