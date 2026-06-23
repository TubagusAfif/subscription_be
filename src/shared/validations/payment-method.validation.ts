import { z } from 'zod';

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be an integer'),
});

export const createPaymentMethodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    bank_mega_code: z.string().min(2).max(50).optional(),
    midtrans_code: z.string().min(2).max(50).optional(),
    fee_type: z.enum(['FIXED', 'PERCENTAGE']),
    fee_value: z.number().nonnegative(),
    image_path: z.string().url().or(z.string().startsWith('/')).optional(),
    is_active: z.boolean().default(true),
  }),
});

export const updatePaymentMethodSchema = z.object({
  params: idParamSchema,
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    bank_mega_code: z.string().min(2).max(50).optional(),
    midtrans_code: z.string().min(2).max(50).optional(),
    fee_type: z.enum(['FIXED', 'PERCENTAGE']).optional(),
    fee_value: z.number().nonnegative().optional(),
    image_path: z.string().url().or(z.string().startsWith('/')).optional(),
    is_active: z.boolean().optional(),
  }),
});

export const getPaymentMethodSchema = z.object({
  params: idParamSchema,
});

export const deletePaymentMethodSchema = z.object({
  params: idParamSchema,
});

export type CreatePaymentMethodBody = z.infer<typeof createPaymentMethodSchema>['body'];
export type UpdatePaymentMethodBody = z.infer<typeof updatePaymentMethodSchema>['body'];
