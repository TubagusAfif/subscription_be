import { PrismaClient } from '@prisma/client';
import { WebhookOutboxService } from '../../shared/services/webhook-outbox.service';
import { MailService } from '../../shared/services/mail.service';
import { InternalRepository } from '../../internal/repositories/internal.repository';
import {
  formatSubscriptionExpired,
  formatAddonExpired,
} from '../../shared/utils/webhook-event-formatters.util';
import { logger } from '../../shared/config/logger';

export class DailyExpiryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly outboxService: WebhookOutboxService,
    private readonly mailService: MailService,
    private readonly internalRepo: InternalRepository,
  ) {}

  public async runDailyExpirySweep(): Promise<void> {
    logger.info('[DailyExpiryService] Starting daily expiry check sweep');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.processPreExpiryNotifications(today);
      await this.processGracePeriodStarts(today);
      await this.processGracePeriodEnforcements(today);
      // Add-ons that expired on their OWN billing cycle (before the package)
      // revoke only the slots they provided — the package's own capacity stays.
      await this.processAddonExpiries(today);

      logger.info('[DailyExpiryService] Daily expiry check completed');
    } catch (error) {
      logger.error('[DailyExpiryService] Failed', { error });
      throw error;
    }
  }

  private async processPreExpiryNotifications(today: Date): Promise<void> {
    // ── 1. Email Notifications: H-7, H-3, H-1, H-0 ──
    const daysBeforeExpiry = [7, 3, 1, 0];

    for (const daysBefore of daysBeforeExpiry) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysBefore);

      const expiringSubscriptions = await this.prisma.subscription.findMany({
        where: {
          current_billing_end: targetDate,
          status: 'ACTIVE',
          deleted_at: null,
        },
        include: {
          user: true,
          sku: true,
        },
      });

      for (const sub of expiringSubscriptions) {
        logger.info(`[DailyExpiryService] H-${daysBefore} notification for subscription ${sub.id}`);
        await this.mailService.sendExpiryWarningEmail(sub.user, daysBefore, sub.sku.sku_name);
      }
    }
  }

  private async processGracePeriodStarts(today: Date): Promise<void> {
    // ── 2. Grace Period Start: H+1 ──
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const justExpired = await this.prisma.subscription.findMany({
      where: {
        current_billing_end: yesterday,
        status: 'ACTIVE',
        deleted_at: null,
      },
      include: { user: true, sku: true },
    });

    for (const sub of justExpired) {
      logger.info(`[DailyExpiryService] Grace period started for subscription ${sub.id}`);
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'ON_HOLD' },
      });
      await this.mailService.sendExpiryWarningEmail(sub.user, -1, sub.sku.sku_name);
    }
  }

  private async processGracePeriodEnforcements(today: Date): Promise<void> {
    // ── 3. Grace Period Enforcement: H+7 ──
    const graceEndDate = new Date(today);
    graceEndDate.setDate(graceEndDate.getDate() - 7);

    const graceExpired = await this.prisma.subscription.findMany({
      where: {
        current_billing_end: graceEndDate,
        status: 'ON_HOLD',
        sku_type: 'PACKAGE',
        deleted_at: null,
      },
      include: {
        user: true,
        sku: true,
      },
    });

    const runStamp = graceEndDate.toISOString().slice(0, 10); // YYYY-MM-DD

    for (const sub of graceExpired) {
      logger.info(`[DailyExpiryService] Enforcing expiry for subscription ${sub.id}`);

      const isTrialExpiry = sub.sku?.sku_code?.toLowerCase().includes('trial') ?? false;

      // Send enforcement email (-7 days)
      await this.mailService.sendExpiryWarningEmail(sub.user, -7, sub.sku.sku_name);

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'EXPIRED',
          expired_at: new Date(),
        },
      });

      const payload = formatSubscriptionExpired(
        sub.user_id,
        sub.purchase_token ?? `sub_${sub.id}`,
        isTrialExpiry,
      );

      await this.outboxService.insertEvent(
        'subscription.expired',
        sub.user_id,
        payload,
        `subscription.expired:${sub.id}:${runStamp}`,
      );

      const child_subscriptions = await this.prisma.subscription.findMany({
        where: { user_id: sub.user_id, deleted_at: null, sku_type: 'ADDON', status: 'ON_HOLD' },
        include: {
          sku: { include: { addons: true } },
          addon_slot_maps: { where: { deleted_at: null } },
        },
      });

      for (const addonSub of child_subscriptions) {
        await this.prisma.subscription.update({
          where: { id: addonSub.id },
          data: { status: 'EXPIRED', expired_at: new Date() },
        });

        for (const addon of addonSub.sku.addons) {
          const clinicIds = addonSub.addon_slot_maps
            .filter((s) => s.ref_type === 'clinic')
            .map((s) => s.ref_id);
          const staffIds = addonSub.addon_slot_maps
            .filter((s) => s.ref_type === 'staff')
            .map((s) => s.ref_id);
          const doctorIds = addonSub.addon_slot_maps
            .filter((s) => s.ref_type === 'doctor')
            .map((s) => s.ref_id);

          if (addon.resource_type === 'CLINIC_ADDON' && clinicIds.length > 0) {
            const addonPayload = formatAddonExpired({
              companyId: sub.user_id,
              externalSubscriptionId: sub.purchase_token ?? `sub_${sub.id}`,
              subscriptionUpdate: { addons: {} },
              enforcementType: 'deactivate_clinics',
              reason: 'addon_clinic_expired',
              clinicIds,
            });
            await this.outboxService.insertEvent(
              'addon.expired',
              sub.user_id,
              addonPayload,
              `addon.expired:clinic:${addonSub.id}:${runStamp}`,
            );
          }

          if (
            addon.resource_type === 'USER_ADDON' &&
            (staffIds.length > 0 || doctorIds.length > 0)
          ) {
            const addonPayload = formatAddonExpired({
              companyId: sub.user_id,
              externalSubscriptionId: sub.purchase_token ?? `sub_${sub.id}`,
              subscriptionUpdate: { addons: {} },
              enforcementType: 'suspend_users',
              reason: 'addon_user_expired',
              staffIds,
              doctorIds,
            });
            await this.outboxService.insertEvent(
              'addon.expired',
              sub.user_id,
              addonPayload,
              `addon.expired:user:${addonSub.id}:${runStamp}`,
            );
          }
        }
      }
    }
  }

  /**
   * Standalone add-on expiry (H+7). Handles add-ons whose OWN billing cycle
   * ended while the package is still active — the case where an owner bought,
   * say, an unlimited-users add-on on top of a 5-user plan.
   *
   * Strict revocation: every slot ATTRIBUTED to the expiring add-on (users 6..N)
   * is released and its ref_ids are sent to Domain 2 for suspension, so those
   * users lose access. The first 5 users live on the package subscription, are
   * never attributed to the add-on, and keep working. The package quota is then
   * reconciled so its cap shrinks back and the unlimited flag clears if this was
   * the only unlimited source.
   */
  private async processAddonExpiries(today: Date): Promise<void> {
    const graceEndDate = new Date(today);
    graceEndDate.setDate(graceEndDate.getDate() - 7);
    const runStamp = graceEndDate.toISOString().slice(0, 10); // YYYY-MM-DD

    const expiredAddons = await this.prisma.subscription.findMany({
      where: {
        current_billing_end: graceEndDate,
        status: 'ON_HOLD',
        sku_type: 'ADDON',
        deleted_at: null,
      },
      include: {
        sku: { include: { addons: { where: { deleted_at: null } } } },
        addon_slot_maps: { where: { deleted_at: null } },
      },
    });

    for (const addonSub of expiredAddons) {
      logger.info(`[DailyExpiryService] Enforcing add-on expiry for subscription ${addonSub.id}`);

      // The package holds the aggregate quota and the external_subscription_id
      // Domain 2 keys on. Prefer a live package; fall back to any of the owner's.
      const pkg = await this.prisma.subscription.findFirst({
        where: { user_id: addonSub.user_id, sku_type: 'PACKAGE', deleted_at: null },
        orderBy: { created_at: 'desc' },
      });
      const externalId =
        pkg?.purchase_token ?? addonSub.purchase_token ?? `sub_${addonSub.id}`;

      const slots = addonSub.addon_slot_maps;
      const clinicIds = slots.filter((s) => s.ref_type === 'clinic').map((s) => s.ref_id);
      const staffIds = slots.filter((s) => s.ref_type === 'staff').map((s) => s.ref_id);
      const doctorIds = slots.filter((s) => s.ref_type === 'doctor').map((s) => s.ref_id);

      const affectedResources = new Set(
        addonSub.sku.addons.map((a) => (a.resource_type === 'CLINIC_ADDON' ? 'clinic' : 'user')),
      );

      // Commit the expiry, slot release, and quota reconcile atomically so the
      // aggregate can never drift if the process dies mid-sweep.
      await this.prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: addonSub.id },
          data: { status: 'EXPIRED', expired_at: new Date() },
        });

        await tx.addonSlotMap.updateMany({
          where: { addon_subscription_id: addonSub.id, deleted_at: null },
          data: { deleted_at: new Date() },
        });

        if (pkg) {
          for (const resourceType of affectedResources) {
            await this.internalRepo.reconcileQuota(pkg.id, addonSub.user_id, resourceType, tx);
          }
        }
      });

      // Post-commit enforcement: tell Domain 2 to suspend exactly the entities
      // that were riding on this add-on. Dedupe keys are per-addon+run so a
      // retried sweep never double-emits.
      if (clinicIds.length > 0) {
        await this.outboxService.insertEvent(
          'addon.expired',
          addonSub.user_id,
          formatAddonExpired({
            companyId: addonSub.user_id,
            externalSubscriptionId: externalId,
            subscriptionUpdate: { addons: {} },
            enforcementType: 'deactivate_clinics',
            reason: 'addon_clinic_expired',
            clinicIds,
          }),
          `addon.expired:clinic:${addonSub.id}:${runStamp}`,
        );
      }

      if (staffIds.length > 0 || doctorIds.length > 0) {
        await this.outboxService.insertEvent(
          'addon.expired',
          addonSub.user_id,
          formatAddonExpired({
            companyId: addonSub.user_id,
            externalSubscriptionId: externalId,
            subscriptionUpdate: { addons: {} },
            enforcementType: 'suspend_users',
            reason: 'addon_user_expired',
            staffIds,
            doctorIds,
          }),
          `addon.expired:user:${addonSub.id}:${runStamp}`,
        );
      }
    }
  }
}
