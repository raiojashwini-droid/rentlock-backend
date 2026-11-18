import { z } from 'zod';

export const tenantPaymentSchema = z.object({
  invoiceId: z.number().int(),
  amount: z.number().positive(),
  paymentMethod: z.string().min(2),
  isAutopayEnabled: z.boolean().default(false),
});

export const tenantWorkOrderSchema = z.object({
  category: z.string().default('General'),
  issueLocation: z.string().min(3),
  accessTime: z.string().default('Anytime during business hours'),
  description: z.string().min(10),
  photoUrls: z.array(z.string()).optional(),
});

export const updateAccessNotesSchema = z.object({
  accessNotes: z.string().min(2, 'Access notes cannot be empty'),
});

export const addTenantNoteSchema = z.object({
  noteText: z.string().min(2, 'Note text cannot be empty'),
});

export const sendMessageSchema = z.object({
  threadId: z.number().int().optional(),
  recipientId: z.number().int(),
  content: z.string().min(1, 'Message cannot be empty'),
  attachmentUrls: z.array(z.string()).optional(),
});
