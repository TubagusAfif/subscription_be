import { PrismaClient } from '@prisma/client';
import { InternalRepository } from '../repositories/internal.repository';
import { AppError } from '../middlewares/error.middleware';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export class InternalService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly internalRepo: InternalRepository
  ) {}

  async slotAssign(payload: { external_subscription_id: string; resource_type: string; ref_type: string; ref_id: number }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await this.internalRepo.findSubscriptionByToken(payload.external_subscription_id, tx);
      if (!subscription) {
        throw new AppError('SUBSCRIPTION_NOT_FOUND', 'Subscription with this external_subscription_id not found', 404);
      }

      const quotaResourceType = payload.resource_type.toLowerCase();
      const quotaRows = await this.internalRepo.getQuotaWithLock(subscription.id, quotaResourceType, tx);

      // Fail closed: without a configured quota row we cannot grant a slot,
      // otherwise assignment would be unbounded and bypass enforcement.
      if (quotaRows.length === 0) {
        throw new AppError('QUOTA_EXCEEDED', `Quota ${payload.resource_type} belum dikonfigurasi untuk subscription ini.`, 409);
      }

      const quota = quotaRows[0]!;

      if (quota.used_quota >= quota.total_quota) {
        throw new AppError('QUOTA_EXCEEDED', `Quota ${payload.resource_type} habis. Owner harus upgrade tier atau beli addon.`, 409);
      }

      await this.internalRepo.incrementQuotaUsed(quota.id, tx);
      const quotaRemaining = quota.total_quota - quota.used_quota - 1;

      const slotMap = await this.internalRepo.createAddonSlotMap({
        addon_subscription_id: subscription.id,
        ref_type: payload.ref_type,
        ref_id: payload.ref_id,
      }, tx);

      return {
        slot_id: slotMap.id,
        quota_remaining: quotaRemaining,
      };
    });
  }

  async slotRelease(payload: { external_subscription_id: string; resource_type: string; ref_id: number }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await this.internalRepo.findSubscriptionByTokenAnyStatus(payload.external_subscription_id, tx);
      if (!subscription) {
        return { quota_remaining: 0, note: 'subscription not found, treated as already released' };
      }

      // Constrain the lookup to ref_types valid for this resource so a USER release
      // can never match a CLINIC slot that happens to share the same ref_id.
      const refTypes = payload.resource_type === 'CLINIC' ? ['clinic'] : ['staff', 'doctor'];
      const slotMap = await this.internalRepo.findAddonSlotMap(subscription.id, payload.ref_id, refTypes, tx);

      const quotaResourceType = payload.resource_type.toLowerCase();

      if (!slotMap) {
        const quota = await this.internalRepo.findQuota(subscription.id, quotaResourceType, tx);
        return {
          quota_remaining: quota ? quota.total_quota - quota.used_quota : undefined,
          note: 'already released or never existed',
        };
      }

      await this.internalRepo.softDeleteAddonSlotMap(slotMap.id, tx);
      const quota = await this.internalRepo.findQuota(subscription.id, quotaResourceType, tx);

      if (quota && quota.used_quota > 0) {
        await this.internalRepo.decrementQuotaUsed(quota.id, tx);
      }

      return {
        quota_remaining: quota ? quota.total_quota - (quota.used_quota - 1) : undefined,
      };
    });
  }

  async getSubscriptionByCompany(externalSubscriptionId: string) {
    const subscription: any = await this.internalRepo.getSubscriptionSnapshot(externalSubscriptionId);
    if (!subscription) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', 'Subscription with this external_subscription_id not found', 404);
    }

    const clinicQuota = subscription.quotas?.find((q: any) => q.resource_type === 'clinic');
    const userQuota = subscription.quotas?.find((q: any) => q.resource_type === 'user');
    const features = subscription.sku?.features?.map((f: any) => f.feature) ?? [];

    const addons: Record<string, unknown> = {};
    for (const child of (subscription.child_subscriptions || [])) {
      for (const addon of (child.sku?.addons || [])) {
        addons[addon.resource_type] = {
          quota_value: addon.quota_value,
          display_name: addon.display_name,
          status: child.status,
          billing_end: child.current_billing_end?.toISOString().split('T')[0],
        };
      }
    }

    const tier = subscription.sku?.package_tier?.toLowerCase() ?? 'basic';

    return {
      event: 'subscription.sync',
      timestamp: new Date().toISOString(),
      data: {
        company_id: subscription.user_id,
        external_subscription_id: subscription.purchase_token ?? '',
        subscription_update: {
          tier,
          status: subscription.status.toLowerCase(),
          max_clinics: clinicQuota?.total_quota,
          max_users_per_clinic: userQuota?.total_quota,
          features,
          addons,
          billing_start: subscription.current_billing_start?.toISOString().split('T')[0] ?? null,
          billing_end: subscription.current_billing_end?.toISOString().split('T')[0] ?? null,
          trial_end: null,
        },
      },
    };
  }

  async generateRenewalUrl(payload: { external_subscription_id: string; return_url: string }) {
    const subscription = await this.internalRepo.findSubscriptionByTokenAnyStatus(payload.external_subscription_id);
    if (!subscription) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', 'Subscription with this external_subscription_id not found', 404);
    }

    let returnUrl: URL;
    try {
      returnUrl = new URL(payload.return_url);
    } catch {
      throw new AppError('INVALID_RETURN_URL', 'return_url is not a valid URL', 400);
    }

    // Exact-match allowlist. Using endsWith('idental.com') / includes('localhost')
    // would also match attacker-controlled hosts such as "evilidental.com" or
    // "localhost.attacker.com", leaking the signed renewal token off-domain.
    const host = returnUrl.hostname.toLowerCase();
    const isIdental = host === 'idental.com' || host.endsWith('.idental.com');
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';

    if (!isIdental && !isLocalhost) {
      throw new AppError('INVALID_RETURN_URL', 'return_url domain is not in the allowlist', 400);
    }

    // Require https for real domains so the token is never sent over plaintext.
    if (isIdental && returnUrl.protocol !== 'https:') {
      throw new AppError('INVALID_RETURN_URL', 'return_url must use https', 400);
    }

    const token = jwt.sign(
      {
        sub: payload.external_subscription_id,
        return_url: payload.return_url,
        action: 'renewal',
      },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '30m' }
    );

    const frontendUrl = env.CLIENT_APP_URL || 'http://localhost:3000';
    return {
      renewal_url: `${frontendUrl}/checkout/renewal?token=${token}`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async getQuotaDetails(externalSubscriptionId: string, resourceType: string) {
    return this.internalRepo.getQuotaDetails(externalSubscriptionId, resourceType);
  }
}
