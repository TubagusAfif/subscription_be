import { z } from 'zod';

const skuTypeEnum = z.enum(['PACKAGE', 'ADDON']);

const packageTierEnum = z.enum(['BASIC', 'LITE', 'MEDIUM', 'PRO', 'ENTERPRISE']);

const resourceTypeEnum = z.enum(['CLINIC_ADDON', 'USER_ADDON']);

const benefitSchema = z.object({
  id: z.number().nullable().optional(),
  benefit_type: z.string().min(1),
  benefit_value: z.string().nullable().optional(),
  max_usage: z.number().int().nonnegative().nullable().optional(),
});

const featureSchema = z.object({
  id: z.number().nullable().optional(),
  display_name: z.string().min(1),
  feature: z.string().min(1),
  is_active: z.boolean().default(true),
});

const addonSchema = z.object({
  id: z.number().nullable().optional(),
  resource_type: resourceTypeEnum,
  display_name: z.string().min(1),
  quota_value: z.number().int().nonnegative(),
  description: z.string().nullable().optional(),
});

export const upsertPlanSchema = z.object({
  body: z.object({
    id: z.number().nullable().optional(),
    sku_name: z.string().min(2).max(255),
    sku_code: z.string().min(2).max(100).toUpperCase(),
    sku_type: skuTypeEnum,
    package_tier: packageTierEnum.nullable().optional(),
    rank: z.number().int().default(0),
    billing_duration_days: z.number().int().positive().default(30),
    coin_cost: z.number().nonnegative(),
    is_active: z.boolean().default(true),

    // Nested components
    benefits: z.array(benefitSchema).optional().default([]),
    features: z.array(featureSchema).optional().default([]),
    addons: z.array(addonSchema).optional().default([]),

    // IDs explicitely designated to be soft-deleted during the upsert process
    removed: z
      .object({
        benefits: z.array(z.number()).default([]),
        addons: z.array(z.number()).default([]),
        features: z.array(z.number()).default([]),
      })
      .optional(),
  }),
});

export const deactivatePlanSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer'),
  }),
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type UpsertPlanBody = z.infer<typeof upsertPlanSchema>['body'];
