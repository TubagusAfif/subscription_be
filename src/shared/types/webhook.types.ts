import {
  WebhookEvent,
  Tier,
  WebhookSubscriptionStatus,
  EnforcementType,
  EnforcementReason,
  MessageId,
} from '../constants/webhook.constants';

/**
 * Standard format for an addon in the payload.
 */
export interface AddonInfo {
  quota_value: number;
  display_name: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'EXPIRED' | 'CANCELLED';
  billing_end: string | null; // YYYY-MM-DD
}

/**
 * The core subscription state synchronized between Domain 1 and Domain 2.
 * ALL fields are optional because updates (like tier upgrade) might only
 * send the fields that changed, unless it's a 'subscription.sync' event.
 */
export interface SubscriptionUpdate {
  tier?: string;
  status?: string;
  max_clinics?: number;
  max_users_per_clinic?: number;
  features?: string[]; // array of feature string codes
  addons?: Record<string, AddonInfo>;
  billing_start?: string | null; // YYYY-MM-DD
  billing_end?: string | null; // YYYY-MM-DD
  trial_end?: string | null; // YYYY-MM-DD
}

/**
 * If the event requires Domain 2 to take action (e.g. lock account),
 * this object tells it exactly what to do.
 */
export interface Enforcement {
  type: EnforcementType;
  reason: EnforcementReason;
  clinic_ids?: number[]; // For deactivate_clinics or reactivate_clinics
  staff_ids?: number[]; // For suspend_users or reactivate_users
  doctor_ids?: number[]; // For suspend_users or reactivate_users
  removed_features?: string[]; // For feature_downgrade or feature_removal
  message_id?: MessageId; // The key Domain 2 uses to show UI messages
}

/**
 * The unified payload envelope sent to Domain 2.
 */
export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string; // ISO8601
  data: {
    company_id: number;
    external_subscription_id: string; // Typically the purchase_token
    context?: string; // e.g., 'trial_ended'
    subscription_update: SubscriptionUpdate;
    enforcement?: Enforcement;
  };
}
