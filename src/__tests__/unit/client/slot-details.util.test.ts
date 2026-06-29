import {
  drainSources,
  buildSlotResourceDetail,
  buildSlotDetails,
  addonResourceToQuotaType,
  SlotSourceInput,
  PackageSlotInput,
  AddonSlotInput,
} from '../../../client/utils/slot-details.util';

describe('slot-details.util', () => {
  describe('addonResourceToQuotaType', () => {
    it('should strip _ADDON suffix and lowercase', () => {
      expect(addonResourceToQuotaType('CLINIC_ADDON')).toBe('clinic');
      expect(addonResourceToQuotaType('USER_ADDON')).toBe('user');
    });

    it('should handle already-lowercase input', () => {
      expect(addonResourceToQuotaType('clinic_ADDON')).toBe('clinic');
    });
  });

  describe('drainSources', () => {
    it('should drain package first, then addons in order', () => {
      const sources: SlotSourceInput[] = [
        { subscription_id: 1, sku_type: 'PACKAGE', sku_id: 10, sku_name: 'Pro', sku_code: 'PRO', capacity: 2 },
        { subscription_id: 2, sku_type: 'ADDON', sku_id: 20, sku_name: 'Addon A', sku_code: 'AA', capacity: 1 },
        { subscription_id: 3, sku_type: 'ADDON', sku_id: 30, sku_name: 'Addon B', sku_code: 'AB', capacity: 2 },
      ];

      const drained = drainSources(sources, 3);

      expect(drained[0]).toMatchObject({ subscription_id: 1, capacity: 2, used: 2, remaining: 0 });
      expect(drained[1]).toMatchObject({ subscription_id: 2, capacity: 1, used: 1, remaining: 0 });
      expect(drained[2]).toMatchObject({ subscription_id: 3, capacity: 2, used: 0, remaining: 2 });
    });

    it('should clamp negative used to 0', () => {
      const sources: SlotSourceInput[] = [
        { subscription_id: 1, sku_type: 'PACKAGE', sku_id: 10, sku_name: 'Pro', sku_code: 'PRO', capacity: 2 },
      ];

      const drained = drainSources(sources, -5);

      expect(drained[0]).toMatchObject({ capacity: 2, used: 0, remaining: 2 });
    });

    it('should clamp negative capacity to 0', () => {
      const sources: SlotSourceInput[] = [
        { subscription_id: 1, sku_type: 'PACKAGE', sku_id: 10, sku_name: 'Pro', sku_code: 'PRO', capacity: -10 },
      ];

      const drained = drainSources(sources, 5);

      expect(drained[0]).toMatchObject({ capacity: 0, used: 0, remaining: 0 });
    });

    it('should handle used exceeding total capacity', () => {
      const sources: SlotSourceInput[] = [
        { subscription_id: 1, sku_type: 'PACKAGE', sku_id: 10, sku_name: 'Pro', sku_code: 'PRO', capacity: 2 },
        { subscription_id: 2, sku_type: 'ADDON', sku_id: 20, sku_name: 'Addon A', sku_code: 'AA', capacity: 1 },
      ];

      const drained = drainSources(sources, 10);

      expect(drained[0]).toMatchObject({ capacity: 2, used: 2, remaining: 0 });
      expect(drained[1]).toMatchObject({ capacity: 1, used: 1, remaining: 0 });
    });

    it('should handle zero used', () => {
      const sources: SlotSourceInput[] = [
        { subscription_id: 1, sku_type: 'PACKAGE', sku_id: 10, sku_name: 'Pro', sku_code: 'PRO', capacity: 5 },
      ];

      const drained = drainSources(sources, 0);

      expect(drained[0]).toMatchObject({ capacity: 5, used: 0, remaining: 5 });
    });

    it('should handle empty sources', () => {
      const drained = drainSources([], 5);
      expect(drained).toEqual([]);
    });
  });

  describe('buildSlotResourceDetail', () => {
    it('should build correct group summary', () => {
      const sources: SlotSourceInput[] = [
        { subscription_id: 1, sku_type: 'PACKAGE', sku_id: 10, sku_name: 'Pro', sku_code: 'PRO', capacity: 3 },
        { subscription_id: 2, sku_type: 'ADDON', sku_id: 20, sku_name: 'Extra', sku_code: 'EX', capacity: 2 },
      ];

      const detail = buildSlotResourceDetail('clinic', sources, 2);

      expect(detail.resource_type).toBe('clinic');
      expect(detail.total_capacity).toBe(5);
      expect(detail.total_used).toBe(2);
      expect(detail.total_remaining).toBe(3);
      expect(detail.sources).toHaveLength(2);
    });

    it('should handle negative total_remaining when used exceeds capacity', () => {
      const sources: SlotSourceInput[] = [
        { subscription_id: 1, sku_type: 'PACKAGE', sku_id: 10, sku_name: 'Pro', sku_code: 'PRO', capacity: 2 },
      ];

      const detail = buildSlotResourceDetail('clinic', sources, 10);

      expect(detail.total_capacity).toBe(2);
      expect(detail.total_used).toBe(10);
      expect(detail.total_remaining).toBe(-8);
    });
  });

  describe('buildSlotDetails', () => {
    const pkg: PackageSlotInput = {
      subscription_id: 1,
      sku: { id: 10, sku_name: 'Professional', sku_code: 'PRO' },
      benefits: [
        { benefit_type: 'clinic', max_usage: 2 },
        { benefit_type: 'user', max_usage: 5 },
      ],
    };

    const addons: AddonSlotInput[] = [
      {
        subscription_id: 2,
        sku: { id: 20, sku_name: 'Extra Clinic', sku_code: 'EC' },
        addons: [{ resource_type: 'CLINIC_ADDON', quota_value: 1 }],
      },
      {
        subscription_id: 3,
        sku: { id: 30, sku_name: 'Extra User', sku_code: 'EU' },
        addons: [{ resource_type: 'USER_ADDON', quota_value: 3 }],
      },
    ];

    it('should build detail for all resource types', () => {
      const details = buildSlotDetails(['clinic', 'user'], pkg, addons, { clinic: 2, user: 3 });

      expect(details).toHaveLength(2);

      const clinicDetail = details.find((d) => d.resource_type === 'clinic');
      expect(clinicDetail).toBeDefined();
      expect(clinicDetail!.total_capacity).toBe(3); // 2 from package + 1 from addon
      expect(clinicDetail!.total_used).toBe(2);
      expect(clinicDetail!.sources).toHaveLength(2); // package + clinic addon

      const userDetail = details.find((d) => d.resource_type === 'user');
      expect(userDetail).toBeDefined();
      expect(userDetail!.total_capacity).toBe(8); // 5 from package + 3 from addon
      expect(userDetail!.total_used).toBe(3);
      expect(userDetail!.sources).toHaveLength(2); // package + user addon
    });

    it('should show package with 0 capacity when no benefit for that type', () => {
      const pkgNoBenefit: PackageSlotInput = {
        subscription_id: 1,
        sku: { id: 10, sku_name: 'Basic', sku_code: 'BASIC' },
        benefits: [],
      };

      const details = buildSlotDetails(['clinic'], pkgNoBenefit, [], {});

      expect(details).toHaveLength(1);
      expect(details[0].sources).toHaveLength(1);
      expect(details[0].sources[0]).toMatchObject({
        sku_type: 'PACKAGE',
        capacity: 0,
        used: 0,
        remaining: 0,
      });
    });

    it('should omit addons with 0 capacity for that resource', () => {
      const addonNoCapacity: AddonSlotInput[] = [
        {
          subscription_id: 2,
          sku: { id: 20, sku_name: 'User Only', sku_code: 'UO' },
          addons: [{ resource_type: 'USER_ADDON', quota_value: 2 }],
        },
      ];

      const details = buildSlotDetails(['clinic'], pkg, addonNoCapacity, {});

      expect(details[0].sources).toHaveLength(1); // only package, addon omitted
      expect(details[0].sources[0].sku_type).toBe('PACKAGE');
    });

    it('should handle null package', () => {
      const details = buildSlotDetails(['clinic'], null, addons, { clinic: 1 });

      expect(details[0].sources).toHaveLength(1); // only clinic addon
      expect(details[0].sources[0]).toMatchObject({
        sku_type: 'ADDON',
        subscription_id: 2,
      });
    });

    it('should handle empty addons', () => {
      const details = buildSlotDetails(['clinic'], pkg, [], { clinic: 1 });

      expect(details[0].sources).toHaveLength(1); // only package
      expect(details[0].sources[0].sku_type).toBe('PACKAGE');
    });

    it('should handle missing used count (default 0)', () => {
      const details = buildSlotDetails(['clinic'], pkg, [], {});

      expect(details[0].total_used).toBe(0);
      expect(details[0].total_remaining).toBe(2); // package capacity
    });
  });
});
