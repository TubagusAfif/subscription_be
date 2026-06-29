import { z } from 'zod';

export const slotAssignSchema = z.object({
  external_subscription_id: z.string().min(1),
  resource_type: z.enum(['CLINIC', 'USER']),
  ref_id: z.number().int().positive(),
  ref_type: z.enum(['clinic', 'staff', 'doctor']),
  assigned_at: z.string().datetime(),
});

export const slotReleaseSchema = z.object({
  external_subscription_id: z.string().min(1),
  resource_type: z.enum(['CLINIC', 'USER']),
  ref_id: z.number().int().positive(),
});

export const renewalUrlSchema = z.object({
  external_subscription_id: z.string().min(1),
  return_url: z.string().url(),
});
