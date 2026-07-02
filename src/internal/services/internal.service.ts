import { PrismaClient } from '@prisma/client';
import { InternalRepository } from '../repositories/internal.repository';
import { AppError } from '../../shared/middlewares/error.middleware';
import { UNLIMITED_QUOTA } from '../../shared/constants/quota.constants';
import jwt from 'jsonwebtoken';
import { env } from '../../shared/config/env';

export class InternalService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly internalRepo: InternalRepository,
  ) {}

  async slotAssign(payload: {
    external_subscription_id: string;
    resource_type: string;
    ref_type: string;
    ref_id: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await this.internalRepo.findSubscriptionByToken(
        payload.external_subscription_id,
        tx,
      );
      if (!subscription) {
        throw new AppError(
          'SUBSCRIPTION_NOT_FOUND',
          'Subscription with this external_subscription_id not found',
          404,
        );
      }

      const quotaResourceType = payload.resource_type.toLowerCase();
      const quotaRows = await this.internalRepo.getQuotaWithLock(
        subscription.id,
        quotaResourceType,
        tx,
      );

      // Fail closed: without a configured quota row we cannot grant a slot,
      // otherwise assignment would be unbounded and bypass enforcement.
      if (quotaRows.length === 0) {
        throw new AppError(
          'QUOTA_EXCEEDED',
          `Quota ${payload.resource_type} belum dikonfigurasi untuk subscription ini.`,
          409,
        );
      }

      const quota = quotaRows[0]!;

      // Unlimited quotas never block. We still increment used_quota below so
      // real usage stays observable for reporting, it just isn't a ceiling.
      if (!quota.is_unlimited && quota.used_quota >= quota.total_quota) {
        throw new AppError(
          'QUOTA_EXCEEDED',
          `Quota ${payload.resource_type} habis. Owner harus upgrade tier atau beli addon.`,
          409,
        );
      }

      // Attribute this slot to a specific source, package first then add-ons
      // oldest-first. Persisting the source on the slot map is what lets add-on
      // expiry later revoke exactly the slots that add-on provided — the
      // package's own capacity (e.g. the first 5 users) is never touched.
      const refTypes = quotaResourceType === 'clinic' ? ['clinic'] : ['staff', 'doctor'];
      const sources = await this.internalRepo.getAssignmentSources(
        subscription.id,
        subscription.user_id,
        quotaResourceType,
        tx,
      );
      const usedBySource = await this.internalRepo.countSlotsBySource(
        sources.map((s) => s.subscriptionId),
        refTypes,
        tx,
      );

      // Default to the package sub; the aggregate check above guarantees at
      // least one source has room, so this fallback is only hit if config drifts.
      let attributedSubscriptionId = subscription.id;
      for (const source of sources) {
        const used = usedBySource.get(source.subscriptionId) ?? 0;
        if (source.is_unlimited || used < source.capacity) {
          attributedSubscriptionId = source.subscriptionId;
          break;
        }
      }

      await this.internalRepo.incrementQuotaUsed(quota.id, tx);
      const quotaRemaining = quota.is_unlimited
        ? UNLIMITED_QUOTA
        : quota.total_quota - quota.used_quota - 1;

      const slotMap = await this.internalRepo.createAddonSlotMap(
        {
          addon_subscription_id: attributedSubscriptionId,
          ref_type: payload.ref_type,
          ref_id: payload.ref_id,
        },
        tx,
      );

      return {
        slot_id: slotMap.id,
        quota_remaining: quotaRemaining,
        attributed_subscription_id: attributedSubscriptionId,
      };
    });
  }

  async slotRelease(payload: {
    external_subscription_id: string;
    resource_type: string;
    ref_id: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await this.internalRepo.findSubscriptionByTokenAnyStatus(
        payload.external_subscription_id,
        tx,
      );
      if (!subscription) {
        return { quota_remaining: 0, note: 'subscription not found, treated as already released' };
      }

      // Constrain the lookup to ref_types valid for this resource so a USER release
      // can never match a CLINIC slot that happens to share the same ref_id. Search
      // across ALL the owner's subscriptions — the slot may be attributed to an
      // add-on, not the package the release token points at.
      const refTypes = payload.resource_type === 'CLINIC' ? ['clinic'] : ['staff', 'doctor'];
      const slotMap = await this.internalRepo.findUserSlotMap(
        subscription.user_id,
        payload.ref_id,
        refTypes,
        tx,
      );

      const quotaResourceType = payload.resource_type.toLowerCase();

      if (!slotMap) {
        const quota = await this.internalRepo.findQuota(subscription.id, quotaResourceType, tx);
        return {
          quota_remaining: quota
            ? quota.is_unlimited
              ? UNLIMITED_QUOTA
              : quota.total_quota - quota.used_quota
            : undefined,
          note: 'already released or never existed',
        };
      }

      await this.internalRepo.softDeleteAddonSlotMap(slotMap.id, tx);
      const quota = await this.internalRepo.findQuota(subscription.id, quotaResourceType, tx);

      if (quota && quota.used_quota > 0) {
        await this.internalRepo.decrementQuotaUsed(quota.id, tx);
      }

      return {
        quota_remaining: quota
          ? quota.is_unlimited
            ? UNLIMITED_QUOTA
            : quota.total_quota - (quota.used_quota - 1)
          : undefined,
      };
    });
  }

  async getSubscriptionByCompany(externalSubscriptionId: string) {
    const subscription: any =
      await this.internalRepo.getSubscriptionSnapshot(externalSubscriptionId);
    if (!subscription) {
      throw new AppError(
        'SUBSCRIPTION_NOT_FOUND',
        'Subscription with this external_subscription_id not found',
        404,
      );
    }

    const clinicQuota = subscription.quotas?.find((q: any) => q.resource_type === 'clinic');
    const userQuota = subscription.quotas?.find((q: any) => q.resource_type === 'user');
    const features = subscription.sku?.features?.map((f: any) => f.feature) ?? [];

    const addons: Record<string, unknown> = {};
    for (const child of subscription.child_subscriptions || []) {
      for (const addon of child.sku?.addons || []) {
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
          // -1 (UNLIMITED_QUOTA) signals "no cap" to Domain 2.
          max_clinics: clinicQuota
            ? clinicQuota.is_unlimited
              ? UNLIMITED_QUOTA
              : clinicQuota.total_quota
            : undefined,
          max_users_per_clinic: userQuota
            ? userQuota.is_unlimited
              ? UNLIMITED_QUOTA
              : userQuota.total_quota
            : undefined,
          features,
          addons,
          billing_start: subscription.current_billing_start?.toISOString().split('T')[0] ?? null,
          billing_end: subscription.current_billing_end?.toISOString().split('T')[0] ?? null,
          trial_end: subscription.sku?.sku_code?.toLowerCase().includes('trial')
            ? (subscription.current_billing_end?.toISOString().split('T')[0] ?? null)
            : null,
        },
      },
    };
  }

  async generateRenewalUrl(payload: { external_subscription_id: string; return_url: string }) {
    const subscription = await this.internalRepo.findSubscriptionByTokenAnyStatus(
      payload.external_subscription_id,
    );
    if (!subscription) {
      throw new AppError(
        'SUBSCRIPTION_NOT_FOUND',
        'Subscription with this external_subscription_id not found',
        404,
      );
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
      { algorithm: 'HS256', expiresIn: '30m' },
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
