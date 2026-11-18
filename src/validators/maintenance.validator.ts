import { z } from 'zod';

export const createTicketSchema = z.object({
  propertyId: z.number().int().optional(),
  unitId: z.number().int().optional().nullable(),
  tenantId: z.number().int().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  category: z.string().optional().default('General'),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency', 'Normal', 'Urgent']).optional().default('Medium'),
  costEstimate: z.number().nonnegative().optional().nullable(),
  cost: z.number().optional().nullable(),
  assignedStaffId: z.number().int().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
}).passthrough();

export const triageTicketSchema = z.object({
  status: z.enum(['Open', 'In_Progress', 'Pending_Approval', 'Resolved', 'Closed']),
  costEstimate: z.number().nonnegative().optional(),
  assignedStaffId: z.number().int().optional(),
});

export const createPreventiveScheduleSchema = z.object({
  propertyId: z.number().int(),
  title: z.string().min(5, 'Schedule title is required'),
  category: z.string().default('General'),
  vendor: z.string().min(2, 'Vendor name is required'),
  frequency: z.enum(['Monthly', 'Quarterly', 'Semi-Annual', 'Annual']),
  nextDue: z.string(),
  costCap: z.number().nonnegative().default(500),
});
