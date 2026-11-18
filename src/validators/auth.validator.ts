import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'manager', 'owner', 'tenant']).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Valid reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
