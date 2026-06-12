import { z } from 'zod';

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be an integer'),
});

// --------------------------------------------------------------------------
// Coin Order Validation
// --------------------------------------------------------------------------

export const createBundleCoinOrderSchema = z.object({
  body: z.object({
    bundle_id: z.number().int().positive('Bundle ID is required'),
    nominal: z.number().positive('Nominal is required'),
    payment_source: z.enum(['va', 'megaqris']),
  }),
});

export const createCoinOrderSchema = z.object({
  body: z.object({
    coin_amount: z.number().int().positive('Coin Amount ID is required'),
    nominal: z.number().positive('Nominal is required'),
    payment_source: z.enum(['va', 'megaqris']),
  }),
});

export const getCoinOrderSchema = z.object({
  params: idParamSchema,
});

export const getCoinOrderStatusSchema = z.object({
  query: z.object({
    order_id: z.string().min(1, 'order_id query parameter is required'),
  }),
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type CreateBundleCoinOrderBody = z.infer<typeof createBundleCoinOrderSchema>['body'];

export type CreateCoinOrderBody = z.infer<typeof createCoinOrderSchema>['body'];
