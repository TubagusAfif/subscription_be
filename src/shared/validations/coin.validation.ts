import { z } from 'zod';

// --------------------------------------------------------------------------
// Params Validation
// --------------------------------------------------------------------------

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be an integer'),
});

// --------------------------------------------------------------------------
// CoinCurrency Validation
// --------------------------------------------------------------------------

export const createCurrencySchema = z.object({
  body: z.object({
    currency_name: z.string().min(2).max(100),
    currency_code: z.string().length(3).toUpperCase(),
    symbol: z.string().min(1).max(10),
    conversion_rate: z.number().positive(),
    is_active: z.boolean().default(true),
    effective_from: z.string().date(), // YYYY-MM-DD expected
    effective_until: z.string().date().nullable().optional(),
  }),
});

export const updateCurrencySchema = z.object({
  params: idParamSchema,
  body: z.object({
    currency_name: z.string().min(2).max(100).optional(),
    currency_code: z.string().length(3).toUpperCase().optional(),
    symbol: z.string().min(1).max(10).optional(),
    conversion_rate: z.number().positive().optional(),
    is_active: z.boolean().optional(),
    effective_from: z.string().date().optional(),
    effective_until: z.string().date().nullable().optional(),
  }),
});

export const getCurrencySchema = z.object({
  params: idParamSchema,
});

export const deleteCurrencySchema = z.object({
  params: idParamSchema,
});

export const activateCurrencySchema = z.object({
  params: idParamSchema,
});

// --------------------------------------------------------------------------
// CoinBundle Validation
// --------------------------------------------------------------------------

export const createBundleSchema = z.object({
  body: z.object({
    bundle_name: z.string().min(2).max(255),
    coin_amount: z.number().int().positive(),
    currency_id: z.number().int().positive(),
    discounted_price: z.number().nonnegative().nullable().optional(),
    is_active: z.boolean().default(true),
  }),
});

export const updateBundleSchema = z.object({
  params: idParamSchema,
  body: z.object({
    bundle_name: z.string().min(2).max(255).optional(),
    coin_amount: z.number().int().positive().optional(),
    currency_id: z.number().int().positive().optional(),
    discounted_price: z.number().nonnegative().nullable().optional(),
    is_active: z.boolean().optional(),
  }),
});

export const getBundleSchema = z.object({
  params: idParamSchema,
});

export const deleteBundleSchema = z.object({
  params: idParamSchema,
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type CreateCurrencyBody = z.infer<typeof createCurrencySchema>['body'];
export type UpdateCurrencyBody = z.infer<typeof updateCurrencySchema>['body'];
export type CreateBundleBody = z.infer<typeof createBundleSchema>['body'];
export type UpdateBundleBody = z.infer<typeof updateBundleSchema>['body'];
