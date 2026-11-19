import { z } from 'zod';

export const createLeaseSchema = z
  .object({
    propertyId: z.coerce.number().int().optional(),
    propertyName: z.string().optional(),
    unitId: z.coerce.number().int().optional(),
    unitNumber: z.string().optional(),
    tenantId: z.coerce.number().int().optional(),
    tenantName: z.string().optional(),
    tenantEmail: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    monthlyRent: z.coerce.number().positive('Monthly rent must be positive').optional(),
    rent: z.coerce.number().positive().optional(),
    securityDeposit: z.coerce.number().nonnegative().optional(),
    deposit: z.coerce.number().nonnegative().optional(),
    status: z.string().optional(),
    termsText: z.string().optional(),
    leaseType: z.string().optional(),
    coSigners: z.any().optional(),
    signers: z.any().optional(),
    rentSchedule: z.any().optional(),
    addenda: z.any().optional(),
    specialClauses: z.string().optional(),
    dueDay: z.string().optional(),
    firstPaymentDate: z.string().optional(),
    stateJurisdiction: z.string().optional(),
    templateVersion: z.string().optional(),
    id: z.any().optional(),
  })
  .passthrough();

export const updateLeaseSchema = createLeaseSchema.partial();

export const signLeaseSchema = z.object({
  signatureData: z.string().min(5, 'Digital signature data is required'),
  legalName: z.string().min(2, 'Signer legal name is required'),
});

export const terminateLeaseSchema = z.object({
  terminationDate: z.string(),
  reason: z.string().min(5, 'Termination reason is required'),
});
