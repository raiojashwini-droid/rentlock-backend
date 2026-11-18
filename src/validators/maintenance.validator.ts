import { z } from 'zod';

export const createTicketSchema = z.object({
  propertyId: z.number().int(),
  unitId: z.number().int().optional(),
  tenantId: z.number().int().optional(),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().default('General'),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']).default('Medium'),
});

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
