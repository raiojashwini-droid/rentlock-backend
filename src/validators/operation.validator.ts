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
  propertyId: z.coerce.number().int().optional(),
  stallNumber: z.string().optional(),
  spotNumber: z.string().optional(),
  stallType: z.string().optional().default('Standard_Covered'),
  spotType: z.string().optional(),
  monthlyFee: z.coerce.number().nonnegative().optional().default(150),
  propertyName: z.string().optional(),
  lotLocation: z.string().optional(),
  assignedResident: z.string().optional().nullable(),
  unitNumber: z.string().optional(),
  vehicle: z.string().optional(),
  licensePlate: z.string().optional(),
  permitTag: z.string().optional(),
  status: z.string().optional(),
}).passthrough();

export const assignParkingStallSchema = z.object({
  tenantId: z.coerce.number().int().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  unitNumber: z.string().optional(),
  assignedResident: z.string().optional(),
  propertyName: z.string().optional(),
  propertyId: z.union([z.number(), z.string()]).optional(),
  licensePlate: z.string().optional(),
  permitTag: z.string().optional(),
  monthlyFee: z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const createVisitorPassSchema = z.object({
  propertyId: z.coerce.number().int().optional(),
  hostTenantId: z.coerce.number().int().optional(),
  unitNumber: z.string().optional().default('T2'),
  guestName: z.string().min(1, 'Guest name is required'),
  guestPhone: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  guestPlate: z.string().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  entryMethod: z.string().optional().default('Front Desk / Intercom'),
  expiresAt: z.string().optional().nullable(),
  expectedDate: z.string().optional().nullable(),
  hostResident: z.string().optional().nullable(),
  propertyName: z.string().optional().nullable(),
  parkingStall: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createStaffSchema = z.object({
  propertyId: z.coerce.number().int().positive('Please select a valid property'),
  name: z.string().min(2, 'Staff full name is required'),
  roleTitle: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional().default(''),
  email: z.string().email('Valid email address is required'),
  fobKeyId: z.string().optional().nullable(),
  keyFobId: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  shift: z.string().optional().nullable(),
  activeKeys: z.string().optional().nullable(),
}).refine((data) => Boolean(data.roleTitle || data.role), {
  message: 'Role / Title is required',
  path: ['roleTitle'],
});

export const updateStaffSchema = z.object({
  propertyId: z.coerce.number().int().positive().optional(),
  name: z.string().min(2).optional(),
  roleTitle: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  fobKeyId: z.string().optional().nullable(),
  keyFobId: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  shift: z.string().optional().nullable(),
  activeKeys: z.string().optional().nullable(),
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
