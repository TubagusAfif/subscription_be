import { PrismaClient } from '@prisma/client';
import { WebhookOutboxService } from '../../shared/services/webhook-outbox.service';
import { MailService } from '../../shared/services/mail.service';
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
  ) {}

  public async runDailyExpirySweep(): Promise<void> {
    logger.info('[DailyExpiryService] Starting daily expiry check sweep');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.processPreExpiryNotifications(today);
      await this.processGracePeriodStarts(today);
      await this.processGracePeriodEnforcements(today);

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
}
