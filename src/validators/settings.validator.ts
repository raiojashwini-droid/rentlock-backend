import { z } from 'zod';

export const updateRbacSchema = z.object({
  permissions: z.object({
    canViewTenants: z.boolean(),
    canAddTenants: z.boolean(),
    canEditTenants: z.boolean(),
    canDeleteTenants: z.boolean(),
    canViewProperties: z.boolean(),
    canAddProperties: z.boolean(),
    canEditProperties: z.boolean(),
    canDeleteProperties: z.boolean(),
  }),
  reason: z.string().min(5, 'Mandatory audit reason required'),
});

export const resetRbacSchema = z.object({
  reason: z.string().optional(),
});
