import { z } from 'zod';

// --------------------------------------------------------------------------
// Params Validation
// --------------------------------------------------------------------------

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be an integer'),
});

// --------------------------------------------------------------------------
// PaymentGatewayConfig Validation
// --------------------------------------------------------------------------

export const createPaymentGatewaySchema = z.object({
  body: z.object({
    gateway_name: z.string().min(2).max(100),
    provider: z.string().min(2).max(100),
    api_key_ref: z.string().min(5).max(255),
    webhook_url: z.string().url().nullable().optional(),
    is_active: z.boolean().default(true),
  }),
});

export const updatePaymentGatewaySchema = z.object({
  params: idParamSchema,
  body: z.object({
    gateway_name: z.string().min(2).max(100).optional(),
    provider: z.string().min(2).max(100).optional(),
    api_key_ref: z.string().min(5).max(255).optional(),
    webhook_url: z.string().url().nullable().optional(),
    is_active: z.boolean().optional(),
  }),
});

export const getPaymentGatewaySchema = z.object({
  params: idParamSchema,
});

export const deletePaymentGatewaySchema = z.object({
  params: idParamSchema,
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type CreatePaymentGatewayBody = z.infer<typeof createPaymentGatewaySchema>['body'];
export type UpdatePaymentGatewayBody = z.infer<typeof updatePaymentGatewaySchema>['body'];
