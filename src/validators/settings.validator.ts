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

export const updateCompanySettingsSchema = z.object({
  companyName: z.string().min(2, 'Legal management entity name is required'),
  ein: z.string().optional(),
  supportEmail: z.string().email('Valid support email required').optional().or(z.literal('')),
  supportPhone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  fiscalYearStart: z.string().optional(),
  timezone: z.string().optional(),
  accountingBasis: z.string().optional(),
  lateFeeGracePeriodDays: z.number().optional(),
  standardSecurityDepositMonths: z.number().optional(),
}).passthrough();
