import { z } from 'zod';

// --------------------------------------------------------------------------
// Params Validation
// --------------------------------------------------------------------------

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be an integer'),
});

// --------------------------------------------------------------------------
// TaxConfig Validation
// --------------------------------------------------------------------------

export const createTaxSchema = z.object({
  body: z.object({
    tax_name: z.string().min(2).max(100),
    rate_percent: z.number().nonnegative(),
    region: z.string().min(2).max(100),
    is_active: z.boolean().default(true),
  }),
});

export const updateTaxSchema = z.object({
  params: idParamSchema,
  body: z.object({
    tax_name: z.string().min(2).max(100).optional(),
    rate_percent: z.number().nonnegative().optional(),
    region: z.string().min(2).max(100).optional(),
    is_active: z.boolean().optional(),
  }),
});

export const getTaxSchema = z.object({
  params: idParamSchema,
});

export const deleteTaxSchema = z.object({
  params: idParamSchema,
});

export const activateTaxSchema = z.object({
  params: idParamSchema,
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type CreateTaxBody = z.infer<typeof createTaxSchema>['body'];
export type UpdateTaxBody = z.infer<typeof updateTaxSchema>['body'];
