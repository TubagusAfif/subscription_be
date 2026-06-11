/**
 * Webhook Integration Constants
 *
 * These values MUST match EXACTLY between Domain 1 and Domain 2.
 * Changing ANY value here without coordinating with Domain 2 will break integration.
 * Reference: domain1-integration-spec.md Section 10
 */

// 9 webhook event types that Domain 1 sends to Domain 2
export const WEBHOOK_EVENTS = [
  'subscription.created',
  'subscription.sync',
  'subscription.renewed',
  'subscription.upgraded',
  'subscription.downgraded',
  'subscription.expired',
  'subscription.cancelled',
  'addon.expired',
  'addon.renewed',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// Subscription tiers
export const TIERS = ['basic', 'business', 'enterprise'] as const;
export type Tier = (typeof TIERS)[number];

// Subscription statuses (for webhook payload)
export const SUBSCRIPTION_STATUSES = ['active', 'trial', 'expired', 'suspended', 'cancelled'] as const;
export type WebhookSubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// Enforcement types — tells Domain 2 WHAT to do
export const ENFORCEMENT_TYPES = [
  'deactivate_clinics',
  'suspend_users',
  'full_lockout',
  'feature_removal',
  'feature_downgrade',
  'feature_upgrade',
  'reactivate_clinics',
  'reactivate_users',
  'full_reactivation',
  'feature_restoration',
] as const;

export type EnforcementType = (typeof ENFORCEMENT_TYPES)[number];

// Resource types for slot assign/release
export const RESOURCE_TYPES = ['CLINIC', 'USER'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

// Ref types for slot mapping (Domain 2 entities)
export const REF_TYPES = ['clinic', 'staff', 'doctor'] as const;
export type RefType = (typeof REF_TYPES)[number];

// Enforcement reasons (snake_case, used for audit log in Domain 2)
export const REASONS = [
  'addon_clinic_expired',
  'addon_user_expired',
  'addon_feature_expired',
  'subscription_expired',
  'subscription_cancelled',
  'tier_downgraded',
  'addon_clinic_renewed',
  'addon_user_renewed',
  'subscription_renewed',
  'tier_upgraded',
] as const;

export type EnforcementReason = (typeof REASONS)[number];

// i18n message IDs (Domain 2 translates these to Bahasa Indonesia)
export const MESSAGE_IDS = [
  'addon_clinic_expired',
  'addon_user_expired',
  'addon_feature_expired',
  'subscription_expired',
  'subscription_cancelled',
  'tier_downgraded',
  'reactivated',
  'manual_deactivation',
] as const;

export type MessageId = (typeof MESSAGE_IDS)[number];

// Retry backoff delays in milliseconds
// Attempt 1: immediate, 2: 1min, 3: 5min, 4: 30min, 5: 2hr, 6: 12hr
export const RETRY_DELAYS_MS = [
  0,           // attempt 1: immediate
  60_000,      // attempt 2: 1 minute
  300_000,     // attempt 3: 5 minutes
  1_800_000,   // attempt 4: 30 minutes
  7_200_000,   // attempt 5: 2 hours
  43_200_000,  // attempt 6: 12 hours
] as const;

// Maximum number of retry attempts before marking as FAILED
export const MAX_RETRY_ATTEMPTS = 6;

// Outbox worker poll interval in milliseconds
export const OUTBOX_POLL_INTERVAL_MS = 30_000; // 30 seconds

// Maximum events to process per poll cycle
export const OUTBOX_BATCH_SIZE = 50;
