import { z } from 'zod';

export const createPropertySchema = z.object({
  name: z.string().min(2, 'Property name is required'),
  type: z.string().optional().default('Multi-Family Residential'),
  address: z.string().optional().default('123 Main St'),
  city: z.string().optional().default('Brooklyn'),
  state: z.string().optional().default('NY'),
  zipCode: z.string().optional().default('11215'),
  yearBuilt: z.number().int().min(1800).max(2030).optional(),
  imageUrl: z.string().url().optional(),
  amenities: z.array(z.string()).optional(),
  managerId: z.number().int().optional(),
  ownerId: z.number().int().optional(),
  accessNotes: z.string().optional(),
  units: z.array(z.any()).optional(),
}).passthrough();

export const updatePropertySchema = createPropertySchema.partial();

export const createUnitSchema = z.object({
  propertyId: z.number().int().optional(),
  unitNumber: z.string().min(1, "Unit number required e.g. 'A-101'").optional().default('A-101'),
  floor: z.number().int().optional().default(1),
  bedrooms: z.number().int().min(0).max(10).optional().default(1),
  bathrooms: z.number().min(0.5).max(10).optional().default(1),
  sqft: z.number().int().positive().optional().default(750),
  rentAmount: z.number().positive('Rent must be positive decimal').optional().default(2000),
  depositAmount: z.number().nonnegative().optional().default(0),
  status: z.enum(['Occupied', 'Vacant', 'Maintenance', 'Reserved']).optional().default('Vacant'),
}).passthrough();

export const updateUnitSchema = createUnitSchema.partial().omit({ propertyId: true });
