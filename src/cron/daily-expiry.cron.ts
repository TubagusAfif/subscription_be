import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { WebhookOutboxService } from '../shared/services/webhook-outbox.service';
import { MailService } from '../shared/services/mail.service';
import {
  formatSubscriptionExpired,
  formatAddonExpired,
} from '../shared/utils/webhook-event-formatters.util';
import { logger } from '../shared/config/logger';

/**
 * Daily Expiry Check Cron Job
 *
 * Runs at 00:05 WIB (UTC+7) = 17:05 UTC every day.
 * Cron expression: '5 17 * * *' (minute 5, hour 17 UTC)
 *
 * Responsibilities:
 * 1. Find subscriptions/addons at H-7, H-3, H-1 (pre-expiry) → send email notifications
 * 2. Find subscriptions/addons at H+1 (just expired) → send grace period email
 * 3. Find subscriptions/addons at H+7 (grace period over) → trigger enforcement webhooks
 */
export function startDailyExpiryCron(
  prisma: PrismaClient,
  outboxService: WebhookOutboxService,
  mailService: MailService,
): void {
  // '5 17 * * *' = 00:05 WIB (UTC+7)
  cron.schedule('5 17 * * *', async () => {
    logger.info('[DailyExpiryCron] Starting daily expiry check');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ── 1. Email Notifications: H-7, H-3, H-1 ──
      const daysBeforeExpiry = [7, 3, 1];

      for (const daysBefore of daysBeforeExpiry) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysBefore);

        // Find subscriptions expiring on targetDate
        const expiringSubscriptions = await prisma.subscription.findMany({
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
          logger.info(`[DailyExpiryCron] H-${daysBefore} notification for subscription ${sub.id}`);
          // TODO: Call mailService.sendExpiryWarning(sub.user.email, daysBefore, sub.sku.sku_name)
          // Implementation depends on email template setup
        }
      }

      // ── 2. Grace Period Start: H+1 ──
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const justExpired = await prisma.subscription.findMany({
        where: {
          current_billing_end: yesterday,
          status: 'ACTIVE',
          deleted_at: null,
        },
        include: { user: true },
      });

      for (const sub of justExpired) {
        logger.info(`[DailyExpiryCron] Grace period started for subscription ${sub.id}`);
        // Update status to ON_HOLD
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'ON_HOLD' },
        });
        // TODO: Send grace period email
      }

      // ── 3. Grace Period Enforcement: H+7 ──
      const graceEndDate = new Date(today);
      graceEndDate.setDate(graceEndDate.getDate() - 7);

      const graceExpired = await prisma.subscription.findMany({
        where: {
          current_billing_end: graceEndDate,
          status: 'ON_HOLD',
          deleted_at: null,
        },
        include: {
          user: true,
          sku: true,
          child_subscriptions: {
            where: { deleted_at: null, sku_type: 'ADDON', status: 'ON_HOLD' },
            include: {
              sku: { include: { addons: true } },
              addon_slot_maps: { where: { deleted_at: null } },
            },
          },
        },
      });

      for (const sub of graceExpired) {
        logger.info(`[DailyExpiryCron] Enforcing expiry for subscription ${sub.id}`);

        // Determine if this is a trial expiry
        // Trial subscriptions have no payment history — check if there are zero orders
        // For simplicity, check if sku_type is related to trial (customize as needed)
        const isTrialExpiry = false; // TODO: implement trial detection logic

        // Update status to EXPIRED
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'EXPIRED',
            expired_at: new Date(),
          },
        });

        // Send webhook to Domain 2
        const payload = formatSubscriptionExpired(
          sub.user_id, // company_id maps to user_id in this schema
          sub.purchase_token ?? `sub_${sub.id}`,
          isTrialExpiry,
        );

        await outboxService.insertEvent(
          'subscription.expired',
          sub.user_id,
          payload,
        );

        // Also handle child addon expirations
        for (const addonSub of sub.child_subscriptions) {
          await prisma.subscription.update({
            where: { id: addonSub.id },
            data: { status: 'EXPIRED', expired_at: new Date() },
          });

          // Determine enforcement type from addon resource_type
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
              await outboxService.insertEvent('addon.expired', sub.user_id, addonPayload);
            }

            if (addon.resource_type === 'USER_ADDON' && (staffIds.length > 0 || doctorIds.length > 0)) {
              const addonPayload = formatAddonExpired({
                companyId: sub.user_id,
                externalSubscriptionId: sub.purchase_token ?? `sub_${sub.id}`,
                subscriptionUpdate: { addons: {} },
                enforcementType: 'suspend_users',
                reason: 'addon_user_expired',
                staffIds,
                doctorIds,
              });
              await outboxService.insertEvent('addon.expired', sub.user_id, addonPayload);
            }
          }
        }
      }

      logger.info('[DailyExpiryCron] Daily expiry check completed');
    } catch (error) {
      logger.error('[DailyExpiryCron] Failed', { error });
    }
  });

  logger.info('[DailyExpiryCron] Scheduled daily at 00:05 WIB (17:05 UTC)');
}
