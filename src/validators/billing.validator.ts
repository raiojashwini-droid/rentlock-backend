import { z } from 'zod';

export const createInvoiceSchema = z.object({
  tenantId: z.number().int(),
  unitId: z.number().int(),
  description: z.string().min(3, 'Description is required'),
  amount: z.number().positive('Invoice amount must be positive'),
  dueDate: z.string(),
});

export const payInvoiceSchema = z.object({
  amountPaid: z.number().positive('Payment amount must be positive'),
  paymentMethod: z.enum(['Stripe Card', 'ACH Direct', 'Manual Check', 'Cash Drawer']),
  referenceNotes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const voidInvoiceSchema = z.object({
  voidReason: z.string().min(5, 'Reason for voiding is required'),
});

export const reverseReceiptSchema = z.object({
  reason: z.string().min(5, 'Reason for receipt reversal is required'),
});

export const createAdjustmentSchema = z.object({
  tenantId: z.number().int(),
  propertyId: z.number().int(),
  type: z.enum(['Credit (Concession)', 'Late Fee Waiver', 'Debit Charge', 'Security Deposit Credit']),
  amount: z.number().positive('Adjustment amount must be positive'),
  reason: z.string().min(5, 'Mandatory justification for ledger adjustment'),
});

export const deductDepositSchema = z.object({
  proposedDeduction: z.number().nonnegative(),
  deductionReason: z.string().min(5, 'Reason for deduction is required'),
  linkedInvoicePdf: z.string().optional(),
});

export const refundDepositSchema = z.object({
  refundMethod: z.enum(['Direct Deposit (ACH)', 'Check', 'Wire Transfer']).default('Direct Deposit (ACH)'),
  dispositionNotes: z.string().optional(),
});

export const createExpenseSchema = z.object({
  propertyId: z.number().int(),
  vendorId: z.number().int().optional(),
  category: z.string().min(2, 'Category is required'),
  description: z.string().min(3, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().optional(),
  isPaid: z.boolean().default(false),
});

export const updateExpenseSchema = createExpenseSchema.partial();
