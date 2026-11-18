import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(2, 'Vendor name is required'),
  category: z.string().min(2, 'Category is required'),
  phone: z.string().optional().default('+1 (555) 000-0000'),
  email: z.string().optional(),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  coiVerified: z.boolean().optional().default(true),
  w9OnFile: z.boolean().optional().default(true),
  paymentTerms: z.string().optional().default('Net 30'),
  paymentMethod: z.string().optional().default('ACH Bank Transfer'),
  bankAccountMasked: z.string().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const createParkingStallSchema = z.object({
  propertyId: z.number().int(),
  stallNumber: z.string().min(1, 'Stall number is required'),
  stallType: z.enum(['Standard_Covered', 'EV_Charging', 'Visitor_Reserved', 'Handicap']).default('Standard_Covered'),
  monthlyFee: z.number().nonnegative().default(150),
});

export const assignParkingStallSchema = z.object({
  tenantId: z.number().int(),
  vehiclePlate: z.string().min(2, 'Vehicle plate is required'),
});

export const createVisitorPassSchema = z.object({
  propertyId: z.number().int(),
  hostTenantId: z.number().int(),
  unitNumber: z.string().min(1),
  guestName: z.string().min(2, 'Guest name is required'),
  guestPhone: z.string().optional(),
  guestPlate: z.string().optional(),
  entryMethod: z.string().default('Front Desk / Intercom'),
  expiresAt: z.string(),
});

export const createStaffSchema = z.object({
  propertyId: z.number().int(),
  name: z.string().min(2),
  roleTitle: z.string().min(2),
  phone: z.string(),
  email: z.string().email(),
  fobKeyId: z.string().optional(),
});

export const toggleShiftSchema = z.object({
  shiftStatus: z.enum(['On_Duty', 'Off_Duty']),
});

export const createBroadcastSchema = z.object({
  propertyId: z.number().int().optional(), // null for portfolio wide
  title: z.string().min(3),
  content: z.string().min(5),
  targetAudience: z.string().default('All Building Residents'),
  isUrgent: z.boolean().default(false),
});
