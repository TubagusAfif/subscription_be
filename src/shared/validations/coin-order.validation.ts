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
    payment_source: z.enum(['va', 'qris']),
  }),
});

export const createCoinOrderSchema = z.object({
  body: z.object({
    coin_amount: z.number().int().positive('Coin Amount ID is required'),
    nominal: z.number().positive('Nominal is required'),
    payment_source: z.enum(['va', 'qris']),
  }),
});

export const getCoinOrderSchema = z.object({
  params: idParamSchema,
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type CreateBundleCoinOrderBody = z.infer<typeof createBundleCoinOrderSchema>['body'];

export type CreateCoinOrderBody = z.infer<typeof createCoinOrderSchema>['body'];
