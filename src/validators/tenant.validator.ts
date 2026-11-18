import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Full legal name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(8, 'Valid phone number required'),
  propertyId: z.number().int(),
  unitId: z.number().int().optional(),
  status: z.enum(['Active', 'Pending', 'Notice_Given', 'Past']).default('Active'),
  emergencyContact: z.string().optional(),
  vehiclePlate: z.string().optional(),
  moveInDate: z.string().optional(),
  moveOutDate: z.string().optional(),
  privateNotes: z.string().optional(),
  createPortalLogin: z.boolean().default(true),
  password: z.string().min(6).optional(),
});

export const updateTenantSchema = createTenantSchema.partial();
