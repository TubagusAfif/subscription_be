import {
  formatSubscriptionCreated,
  formatSubscriptionSync,
  formatSubscriptionRenewed,
  formatSubscriptionUpgraded,
  formatSubscriptionDowngraded,
  formatSubscriptionExpired,
  formatSubscriptionCancelled,
  formatAddonExpired,
  formatAddonRenewed,
} from '../../../shared/utils/webhook-event-formatters.util';
import { SubscriptionUpdate } from '../../../shared/types/webhook.types';

describe('Webhook Event Formatters', () => {
  const companyId = 123;
  const externalSubscriptionId = 'sub_test_123';
  const mockSubscriptionUpdate: SubscriptionUpdate = {
    status: 'active',
    max_clinics: 2,
    max_users_per_clinic: 5,
    features: ['feature_A'],
    addons: {},
  };

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T00:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('formats subscription.created correctly', () => {
    const result = formatSubscriptionCreated(companyId, externalSubscriptionId, mockSubscriptionUpdate as Required<SubscriptionUpdate>);
    expect(result.event).toBe('subscription.created');
    expect(result.data.company_id).toBe(companyId);
    expect(result.data.external_subscription_id).toBe(externalSubscriptionId);
    expect(result.data.subscription_update).toEqual(mockSubscriptionUpdate);
    expect(result.data.enforcement).toBeUndefined();
    expect(result.timestamp).toBe('2026-06-03T00:00:00.000Z');
  });

  it('formats subscription.sync correctly', () => {
    const result = formatSubscriptionSync(companyId, externalSubscriptionId, mockSubscriptionUpdate as Required<SubscriptionUpdate>);
    expect(result.event).toBe('subscription.sync');
    expect(result.data.company_id).toBe(companyId);
  });

  it('formats subscription.renewed correctly (wasExpired: false)', () => {
    const result = formatSubscriptionRenewed(companyId, externalSubscriptionId, mockSubscriptionUpdate, false);
    expect(result.event).toBe('subscription.renewed');
    expect(result.data.enforcement).toBeUndefined();
  });

  it('formats subscription.renewed correctly (wasExpired: true)', () => {
    const result = formatSubscriptionRenewed(companyId, externalSubscriptionId, mockSubscriptionUpdate, true);
    expect(result.event).toBe('subscription.renewed');
    expect(result.data.enforcement).toEqual({
      type: 'full_reactivation',
      reason: 'subscription_renewed',
      message_id: 'reactivated',
    });
  });

  it('formats subscription.upgraded correctly', () => {
    const result = formatSubscriptionUpgraded(companyId, externalSubscriptionId, mockSubscriptionUpdate);
    expect(result.event).toBe('subscription.upgraded');
    expect(result.data.enforcement).toEqual({
      type: 'feature_upgrade',
      reason: 'tier_upgraded',
      message_id: 'reactivated',
    });
  });

  it('formats subscription.downgraded correctly', () => {
    const removedFeatures = ['feature_B'];
    const result = formatSubscriptionDowngraded(companyId, externalSubscriptionId, mockSubscriptionUpdate, removedFeatures);
    expect(result.event).toBe('subscription.downgraded');
    expect(result.data.enforcement).toEqual({
      type: 'feature_downgrade',
      reason: 'tier_downgraded',
      removed_features: ['feature_B'],
      message_id: 'tier_downgraded',
    });
  });

  it('formats subscription.expired correctly', () => {
    const result = formatSubscriptionExpired(companyId, externalSubscriptionId);
    expect(result.event).toBe('subscription.expired');
    expect(result.data.subscription_update).toEqual({
      status: 'expired',
      max_clinics: 0,
      max_users_per_clinic: 0,
      features: [],
      addons: {},
    });
    expect(result.data.enforcement).toEqual({
      type: 'full_lockout',
      reason: 'subscription_expired',
      message_id: 'subscription_expired',
    });
    expect(result.data.context).toBeUndefined();
  });

  it('formats subscription.expired correctly (trial expiry)', () => {
    const result = formatSubscriptionExpired(companyId, externalSubscriptionId, true);
    expect(result.data.context).toBe('trial_ended');
  });

  it('formats subscription.cancelled correctly', () => {
    const result = formatSubscriptionCancelled(companyId, externalSubscriptionId);
    expect(result.event).toBe('subscription.cancelled');
    expect(result.data.subscription_update).toEqual({
      status: 'cancelled',
      max_clinics: 0,
      max_users_per_clinic: 0,
      features: [],
      addons: {},
    });
    expect(result.data.enforcement).toEqual({
      type: 'full_lockout',
      reason: 'subscription_cancelled',
      message_id: 'subscription_cancelled',
    });
  });

  it('formats addon.expired correctly', () => {
    const result = formatAddonExpired({
      companyId,
      externalSubscriptionId,
      subscriptionUpdate: mockSubscriptionUpdate,
      enforcementType: 'deactivate_clinics',
      reason: 'addon_clinic_expired',
      clinicIds: [1, 2],
    });
    expect(result.event).toBe('addon.expired');
    expect(result.data.enforcement).toEqual({
      type: 'deactivate_clinics',
      reason: 'addon_clinic_expired',
      clinic_ids: [1, 2],
      staff_ids: [],
      doctor_ids: [],
      removed_features: [],
      message_id: 'addon_clinic_expired',
    });
  });

  it('formats addon.renewed correctly', () => {
    const result = formatAddonRenewed({
      companyId,
      externalSubscriptionId,
      subscriptionUpdate: mockSubscriptionUpdate,
      enforcementType: 'reactivate_clinics',
      reason: 'addon_clinic_renewed',
      clinicIds: [3],
    });
    expect(result.event).toBe('addon.renewed');
    expect(result.data.enforcement).toEqual({
      type: 'reactivate_clinics',
      reason: 'addon_clinic_renewed',
      clinic_ids: [3],
      staff_ids: [],
      doctor_ids: [],
      message_id: 'reactivated',
    });
  });
});
