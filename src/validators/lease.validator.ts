import { z } from 'zod';

export const createLeaseSchema = z.object({
  propertyId: z.number().int(),
  unitId: z.number().int(),
  tenantId: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
  monthlyRent: z.number().positive('Monthly rent must be positive'),
  securityDeposit: z.number().nonnegative(),
  termsText: z.string().optional(),
});

export const updateLeaseSchema = createLeaseSchema.partial();

export const signLeaseSchema = z.object({
  signatureData: z.string().min(5, 'Digital signature data is required'),
  legalName: z.string().min(2, 'Signer legal name is required'),
});

export const terminateLeaseSchema = z.object({
  terminationDate: z.string(),
  reason: z.string().min(5, 'Termination reason is required'),
});
