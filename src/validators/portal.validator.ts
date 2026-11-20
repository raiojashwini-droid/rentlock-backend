import { z } from 'zod';

export const tenantPaymentSchema = z.object({
  invoiceId: z.number().int().optional().nullable(),
  amount: z.number().positive(),
  paymentMethod: z.string().min(2),
  isAutopayEnabled: z.boolean().default(false),
});

export const tenantWorkOrderSchema = z.object({
  category: z.string().optional().default('General'),
  issueLocation: z.string().optional().default('Assigned Unit'),
  accessTime: z.string().optional().default('Anytime during business hours'),
  description: z.string().min(1, 'Please describe the problem'),
  urgency: z.string().optional().default('Normal'),
  priority: z.string().optional(),
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
