import { z } from 'zod';

export const updateAccountSchema = z.object({
  body: z.object({
    name: z.string('Name is required').min(2, 'Name must be at least 2 characters').max(255),
    phone: z.string().optional().nullable(),
    profile: z
      .object({
        date_of_birth: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        address_line1: z.string().optional().nullable(),
        address_line2: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        utc_timezone: z.string().optional().nullable(),
        province: z.string().optional().nullable(),
        postal_code: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        clinic_name: z.string().optional().nullable(),
        photo_url: z
          .string()
          .regex(/^(?!https?:\/\/).*/i, 'Photo URL must be a relative path, not a full URL')
          .optional()
          .nullable(),
      })
      .optional()
      .nullable(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string('Current password is required')
      .min(1, 'Current password is required'),
    newPassword: z
      .string('New password is required')
      .min(8, 'New password must be at least 8 characters')
      .max(72),
  }),
});

// --------------------------------------------------------------------------
// Exported Body Types
// --------------------------------------------------------------------------
export type UpdateAccountBody = z.infer<typeof updateAccountSchema>['body'];
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>['body'];
