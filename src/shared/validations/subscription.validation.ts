import { z } from 'zod';

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be an integer'),
});

// --------------------------------------------------------------------------
// Subscription Validation
// --------------------------------------------------------------------------

export const subscribeSchema = z.object({
  body: z.object({
    sku_id: z.number().int().positive('SKU ID is required'),
  }),
});

export const cancelSubscriptionSchema = z.object({
  params: idParamSchema,
});

export const switchPlanSchema = z.object({
  params: idParamSchema,
  body: z.object({
    new_sku_id: z.number().int().positive('New SKU ID is required'),
  }),
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type SubscribeBody = z.infer<typeof subscribeSchema>['body'];
export type SwitchPlanBody = z.infer<typeof switchPlanSchema>['body'];
