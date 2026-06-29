import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string('Email is required').email('Invalid email address'),
    password: z
      .string('Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(72),
    name: z.string('Name is required').min(2, 'Name must be at least 2 characters').max(255),
    phone: z.string().optional(),
    profile: z
      .object({
        date_of_birth: z.string().optional(),
        gender: z.string().optional(),
        address_line1: z.string().optional(),
        address_line2: z.string().optional(),
        city: z.string().optional(),
        utc_timezone: z.string().optional(),
        province: z.string().optional(),
        postal_code: z.string().optional(),
        country: z.string().optional(),
        clinic_name: z.string().optional(),
        photo_url: z.string().optional(),
      })
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string('Email is required').email('Invalid email address'),
    password: z.string('Password is required').min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string('Refresh token is required').min(1, 'Refresh token is required'),
  }),
});

export const activateSchema = z.object({
  body: z.object({
    token: z.string('Activation token is required').min(1, 'Activation token is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string('Email is required').email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string('Token is required').min(1, 'Token is required'),
    password: z.string('Password is required').min(8, 'Password must be at least 8 characters'),
  }),
});

export const resendActivationSchema = z.object({
  body: z.object({
    email: z.string('Email is required').email('Invalid email address'),
  }),
});
