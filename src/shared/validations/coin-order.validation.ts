import { z } from 'zod';

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be an integer'),
});

// --------------------------------------------------------------------------
// Coin Order Validation
// --------------------------------------------------------------------------

export const createCoinOrderSchema = z.object({
  body: z.object({
    bundle_id: z.number().int().positive('Bundle ID is required'),
    user_name: z.string().optional(),
    user_email: z.string().email().optional(),
    user_phone: z.string().optional(),
    payment_source: z.enum(['va', 'qris']).optional(),
  }),
});

export const getCoinOrderSchema = z.object({
  params: idParamSchema,
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type CreateCoinOrderBody = z.infer<typeof createCoinOrderSchema>['body'];
