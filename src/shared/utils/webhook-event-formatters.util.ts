import { WebhookPayload, SubscriptionUpdate, Enforcement } from '../types/webhook.types';
import { WebhookEvent, EnforcementType, EnforcementReason, MessageId } from '../constants/webhook.constants';

/**
 * Helper to build the standard webhook payload envelope.
 * All 9 event formatters use this internally.
 */
function buildPayload(
  event: WebhookEvent,
  companyId: number,
  externalSubscriptionId: string,
  subscriptionUpdate: SubscriptionUpdate,
  enforcement?: Enforcement,
  context?: string,
): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    data: {
      company_id: companyId,
      external_subscription_id: externalSubscriptionId,
      ...(context ? { context } : {}),
      subscription_update: subscriptionUpdate,
      ...(enforcement ? { enforcement } : {}),
    },
  };
}

// ─── 1. subscription.created ────────────────────────────────────────────────

/**
 * Owner first-time purchase → company provisioned in Domain 2.
 * Sends FULL subscription state (all fields).
 * No enforcement needed.
 */
export function formatSubscriptionCreated(
  companyId: number,
  externalSubscriptionId: string,
  subscriptionUpdate: Required<SubscriptionUpdate>,
): WebhookPayload {
  return buildPayload(
    'subscription.created',
    companyId,
    externalSubscriptionId,
    subscriptionUpdate,
  );
}

// ─── 2. subscription.sync ───────────────────────────────────────────────────

/**
 * Manual or scheduled full re-sync.
 * Domain 2 will FULL OVERWRITE the company_subscriptions row.
 * ALL fields must be present in subscriptionUpdate.
 * No enforcement needed.
 */
export function formatSubscriptionSync(
  companyId: number,
  externalSubscriptionId: string,
  subscriptionUpdate: Required<SubscriptionUpdate>,
): WebhookPayload {
  return buildPayload(
    'subscription.sync',
    companyId,
    externalSubscriptionId,
    subscriptionUpdate,
  );
}

// ─── 3. subscription.renewed ────────────────────────────────────────────────

/**
 * Subscription extended (billing_end moves forward).
 * If previously expired → enforcement = full_reactivation.
 * If was already active → no enforcement needed.
 */
export function formatSubscriptionRenewed(
  companyId: number,
  externalSubscriptionId: string,
  subscriptionUpdate: SubscriptionUpdate,
  wasExpired: boolean,
): WebhookPayload {
  const enforcement: Enforcement | undefined = wasExpired
    ? {
        type: 'full_reactivation',
        reason: 'subscription_renewed',
        message_id: 'reactivated',
      }
    : undefined;

  return buildPayload(
    'subscription.renewed',
    companyId,
    externalSubscriptionId,
    subscriptionUpdate,
    enforcement,
  );
}

// ─── 4. subscription.upgraded ───────────────────────────────────────────────

/**
 * Tier upgrade (e.g., Business → Enterprise).
 * Enforcement type = feature_upgrade (Domain 2 logs it).
 */
export function formatSubscriptionUpgraded(
  companyId: number,
  externalSubscriptionId: string,
  subscriptionUpdate: SubscriptionUpdate,
): WebhookPayload {
  return buildPayload(
    'subscription.upgraded',
    companyId,
    externalSubscriptionId,
    subscriptionUpdate,
    {
      type: 'feature_upgrade',
      reason: 'tier_upgraded',
      message_id: 'reactivated',
    },
  );
}

// ─── 5. subscription.downgraded ─────────────────────────────────────────────

/**
 * Tier downgrade (e.g., Enterprise → Business).
 * Must include removed_features[] so Domain 2 knows which features to gate.
 */
export function formatSubscriptionDowngraded(
  companyId: number,
  externalSubscriptionId: string,
  subscriptionUpdate: SubscriptionUpdate,
  removedFeatures: string[],
): WebhookPayload {
  return buildPayload(
    'subscription.downgraded',
    companyId,
    externalSubscriptionId,
    subscriptionUpdate,
    {
      type: 'feature_downgrade',
      reason: 'tier_downgraded',
      removed_features: removedFeatures,
      message_id: 'tier_downgraded',
    },
  );
}

// ─── 6. subscription.expired ────────────────────────────────────────────────

/**
 * Base subscription expired after grace period.
 * enforcement.type = full_lockout.
 *
 * If this is a trial expiry, set context = 'trial_ended'.
 */
export function formatSubscriptionExpired(
  companyId: number,
  externalSubscriptionId: string,
  isTrialExpiry: boolean = false,
): WebhookPayload {
  return buildPayload(
    'subscription.expired',
    companyId,
    externalSubscriptionId,
    {
      status: 'expired',
      max_clinics: 0,
      max_users_per_clinic: 0,
      features: [],
      addons: {},
    },
    {
      type: 'full_lockout',
      reason: 'subscription_expired',
      message_id: 'subscription_expired',
    },
    isTrialExpiry ? 'trial_ended' : undefined,
  );
}

// ─── 7. subscription.cancelled ──────────────────────────────────────────────

/**
 * Owner cancelled subscription before billing_end.
 * Immediate lockout — enforcement.type = full_lockout.
 */
export function formatSubscriptionCancelled(
  companyId: number,
  externalSubscriptionId: string,
): WebhookPayload {
  return buildPayload(
    'subscription.cancelled',
    companyId,
    externalSubscriptionId,
    {
      status: 'cancelled',
      max_clinics: 0,
      max_users_per_clinic: 0,
      features: [],
      addons: {},
    },
    {
      type: 'full_lockout',
      reason: 'subscription_cancelled',
      message_id: 'subscription_cancelled',
    },
  );
}

// ─── 8. addon.expired ───────────────────────────────────────────────────────

/**
 * An addon (CLINIC / USER / FEATURE) expired after grace period.
 *
 * Enforcement depends on addon type:
 * - CLINIC addon → deactivate_clinics + clinic_ids[]
 * - USER addon   → suspend_users + staff_ids[] + doctor_ids[]
 * - FEATURE addon → feature_removal + removed_features[]
 */
export function formatAddonExpired(params: {
  companyId: number;
  externalSubscriptionId: string;
  subscriptionUpdate: SubscriptionUpdate;
  enforcementType: 'deactivate_clinics' | 'suspend_users' | 'feature_removal';
  reason: 'addon_clinic_expired' | 'addon_user_expired' | 'addon_feature_expired';
  clinicIds?: number[];
  staffIds?: number[];
  doctorIds?: number[];
  removedFeatures?: string[];
}): WebhookPayload {
  return buildPayload(
    'addon.expired',
    params.companyId,
    params.externalSubscriptionId,
    params.subscriptionUpdate,
    {
      type: params.enforcementType,
      reason: params.reason,
      clinic_ids: params.clinicIds ?? [],
      staff_ids: params.staffIds ?? [],
      doctor_ids: params.doctorIds ?? [],
      removed_features: params.removedFeatures ?? [],
      message_id: params.reason, // reason and message_id match for addon expiry
    },
  );
}

// ─── 9. addon.renewed ───────────────────────────────────────────────────────

/**
 * An addon was renewed/reactivated.
 *
 * Enforcement depends on addon type:
 * - CLINIC addon → reactivate_clinics + clinic_ids[]
 * - USER addon   → reactivate_users + staff_ids[] + doctor_ids[]
 * - FEATURE addon → feature_restoration (no IDs needed)
 */
export function formatAddonRenewed(params: {
  companyId: number;
  externalSubscriptionId: string;
  subscriptionUpdate: SubscriptionUpdate;
  enforcementType: 'reactivate_clinics' | 'reactivate_users' | 'feature_restoration';
  reason: 'addon_clinic_renewed' | 'addon_user_renewed';
  clinicIds?: number[];
  staffIds?: number[];
  doctorIds?: number[];
}): WebhookPayload {
  return buildPayload(
    'addon.renewed',
    params.companyId,
    params.externalSubscriptionId,
    params.subscriptionUpdate,
    {
      type: params.enforcementType,
      reason: params.reason,
      clinic_ids: params.clinicIds ?? [],
      staff_ids: params.staffIds ?? [],
      doctor_ids: params.doctorIds ?? [],
      message_id: 'reactivated',
    },
  );
}
