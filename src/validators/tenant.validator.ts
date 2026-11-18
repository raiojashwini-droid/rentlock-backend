import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Full legal name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  propertyId: z.number().int().optional(),
  propertyName: z.string().optional(),
  unitId: z.number().int().optional().nullable(),
  unitNumber: z.string().optional().nullable(),
  status: z.enum(['Active', 'Pending', 'Notice_Given', 'Past', 'Archived']).default('Active').optional(),
  emergencyContact: z.string().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  moveInDate: z.string().optional().nullable(),
  moveOutDate: z.string().optional().nullable(),
  privateNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createPortalLogin: z.boolean().default(true).optional(),
  password: z.string().optional().nullable(),
}).passthrough();

export const updateTenantSchema = createTenantSchema.partial();
