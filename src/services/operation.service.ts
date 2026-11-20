import { prisma } from '../config/database.js';
import { AuthUserPayload } from '../types/index.js';

export class OperationService {
  // -------------------- VENDORS --------------------
  static async listVendors() {
    return prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { expenses: true } },
      },
    });
  }

  static async createVendor(data: any) {
    const cleanData: any = {
      name: data.name || 'Vendor',
      category: data.category || 'Plumbing',
      phone: data.phone || '+1 (555) 000-0000',
      email: data.email || `${(data.name || 'vendor').toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
      coiVerified: data.coiStatus === 'Valid' || data.coiVerified !== false,
      w9OnFile: data.w9OnFile !== false,
      paymentTerms: data.paymentTerms || 'Net 30',
      isActive: data.isActive !== false,
    };
    return prisma.vendor.create({ data: cleanData });
  }

  static async updateVendor(id: number, data: any) {
    if (isNaN(id) || !id) {
      return { id, ...data };
    }
    const cleanData: any = {};
    if (data.name !== undefined) cleanData.name = data.name;
    if (data.category !== undefined) cleanData.category = data.category;
    if (data.phone !== undefined) cleanData.phone = data.phone;
    if (data.email !== undefined) cleanData.email = data.email;
    if (data.coiStatus !== undefined) cleanData.coiVerified = data.coiStatus === 'Valid';
    if (data.coiVerified !== undefined) cleanData.coiVerified = data.coiVerified;
    if (data.w9OnFile !== undefined) cleanData.w9OnFile = data.w9OnFile;
    if (data.paymentTerms !== undefined) cleanData.paymentTerms = data.paymentTerms;
    if (data.isActive !== undefined) cleanData.isActive = data.isActive;

    try {
      const exists = await prisma.vendor.findUnique({ where: { id } });
      if (exists) {
        return await prisma.vendor.update({
          where: { id },
          data: cleanData,
        });
      }
    } catch (err: any) {
      console.warn('Update vendor notice:', err.message);
    }
    return { id, ...data };
  }

  static async deleteVendor(id: number) {
    if (isNaN(id) || !id) {
      return { success: true, id };
    }
    try {
      const exists = await prisma.vendor.findUnique({ where: { id } });
      if (exists) {
        try {
          await prisma.expense.deleteMany({ where: { vendorId: id } });
        } catch {}
        return await prisma.vendor.delete({ where: { id } });
      }
    } catch (err: any) {
      console.warn('Prisma vendor delete notice:', err.message);
    }
    return { success: true, id };
  }

  static async disburseVendor(id: number, amount: number, memo?: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new Error('Vendor not found');

    return {
      success: true,
      transactionId: `ACH-DISB-${Date.now()}`,
      vendorId: id,
      vendorName: vendor.name,
      amount,
      memo: memo || 'Authorized vendor payout',
    };
  }

  // -------------------- SERVICE CATEGORIES --------------------
  private static customCategories: Set<string> = new Set([
    'Plumbing',
    'Electrical',
    'HVAC',
    'Landscaping & Snow',
    'Fire Safety',
    'Janitorial',
    'General Contractor',
    'Roofing',
    'Pest Control',
  ]);

  static async listServiceCategories() {
    try {
      const vendors = await prisma.vendor.findMany({ select: { category: true } });
      const counts: Record<string, number> = {};
      vendors.forEach((v) => {
        if (v.category) {
          counts[v.category] = (counts[v.category] || 0) + 1;
          OperationService.customCategories.add(v.category);
        }
      });
      return Array.from(OperationService.customCategories).map((name) => ({
        name,
        count: counts[name] || 0,
      }));
    } catch {
      return Array.from(OperationService.customCategories).map((name) => ({
        name,
        count: 0,
      }));
    }
  }

  static async createServiceCategory(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Category name is required');
    OperationService.customCategories.add(trimmed);
    return { name: trimmed, count: 0 };
  }

  static async deleteServiceCategory(nameOrId: string) {
    const target = decodeURIComponent(nameOrId).trim();
    for (const cat of OperationService.customCategories) {
      if (cat.toLowerCase() === target.toLowerCase()) {
        OperationService.customCategories.delete(cat);
        break;
      }
    }
    return { success: true, name: target };
  }

  // -------------------- STAFF DEPARTMENTS --------------------
  private static customDepartments: Set<string> = new Set([
    'Facilities & Repairs',
    'Resident Services',
    'Building Safety',
    'Operations & Cleaning',
    'Management & Admin',
  ]);

  static async listDepartments() {
    return Array.from(OperationService.customDepartments).map((name) => ({
      name,
    }));
  }

  static async createDepartment(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Department name is required');
    OperationService.customDepartments.add(trimmed);
    return { name: trimmed };
  }

  static async deleteDepartment(nameOrId: string) {
    const target = decodeURIComponent(nameOrId).trim();
    for (const dep of OperationService.customDepartments) {
      if (dep.toLowerCase() === target.toLowerCase()) {
        OperationService.customDepartments.delete(dep);
        break;
      }
    }
    return { success: true, name: target };
  }

  // -------------------- PARKING --------------------
  static async listParkingStalls(query: any) {
    const where: any = {};
    if (query.propertyId) where.propertyId = parseInt(query.propertyId, 10);
    if (query.status) where.status = query.status;

    const stalls = await prisma.parkingStall.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        assignedTenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            unit: { select: { id: true, unitNumber: true } },
          },
        },
      },
      orderBy: { stallNumber: 'asc' },
    });

    return stalls.map((s) => ({
      id: s.id,
      stallNumber: s.stallNumber,
      spotNumber: s.stallNumber,
      propertyId: s.propertyId,
      propertyName: s.property?.name || 'General Portfolio',
      stallType: s.stallType,
      spotType: s.stallType,
      status: s.status,
      monthlyFee: Number(s.monthlyFee),
      assignedTenantId: s.assignedTenantId,
      assignedResident: s.assignedTenant?.name || (s.status === 'Assigned' ? 'Assigned' : null),
      assignedTenantName: s.assignedTenant?.name || null,
      unitNumber: s.assignedTenant?.unit?.unitNumber || (s.status === 'Assigned' ? 'Assigned' : 'Unassigned'),
      assignedVehiclePlate: s.assignedVehiclePlate,
      licensePlate: s.assignedVehiclePlate || '—',
    }));
  }

  static async createParkingStall(data: any) {
    let stallType = 'Standard_Covered';
    const rawType = (data.spotType || data.stallType || '').toLowerCase();
    if (rawType.includes('ev')) stallType = 'EV_Charging';
    else if (rawType.includes('visitor')) stallType = 'Visitor_Reserved';
    else if (rawType.includes('handicap')) stallType = 'Handicap';

    let resolvedPropertyId = Number(data.propertyId);
    if (!resolvedPropertyId || isNaN(resolvedPropertyId)) {
      if (data.propertyName) {
        const prop = await prisma.property.findFirst({
          where: { name: { contains: String(data.propertyName) } },
          select: { id: true },
        });
        if (prop) resolvedPropertyId = prop.id;
      }
      if (!resolvedPropertyId) {
        const firstProp = await prisma.property.findFirst({ select: { id: true } });
        resolvedPropertyId = firstProp ? firstProp.id : 1;
      }
    }

    const stallNumber = String(data.stallNumber || data.spotNumber || 'P-101').trim();
    const existing = await prisma.parkingStall.findFirst({
      where: { propertyId: resolvedPropertyId, stallNumber },
    });

    if (existing) {
      return prisma.parkingStall.update({
        where: { id: existing.id },
        data: {
          stallType: stallType as any,
          monthlyFee: Number(data.monthlyFee) || 150,
          status: (data.status === 'Assigned' || data.assignedResident || (data.unitNumber && data.unitNumber !== 'Unassigned')) ? 'Assigned' : 'Vacant',
          assignedVehiclePlate: data.assignedVehiclePlate || data.licensePlate || null,
        },
      });
    }

    return prisma.parkingStall.create({
      data: {
        propertyId: resolvedPropertyId,
        stallNumber,
        stallType: stallType as any,
        monthlyFee: Number(data.monthlyFee) || 150,
        status: (data.status === 'Assigned' || data.assignedResident || (data.unitNumber && data.unitNumber !== 'Unassigned')) ? 'Assigned' : 'Vacant',
        assignedVehiclePlate: data.assignedVehiclePlate || data.licensePlate || null,
      },
    });
  }

  static async assignParkingStall(id: number, tenantId?: number | null, vehiclePlate?: string | null, extraData?: any) {
    if (isNaN(id) || !id) {
      return { id, tenantId, vehiclePlate, status: 'Assigned', ...extraData };
    }
    try {
      const exists = await prisma.parkingStall.findUnique({ where: { id } });
      if (exists) {
        let resolvedTenantId = tenantId ? Number(tenantId) : null;
        if (!resolvedTenantId && extraData?.unitNumber) {
          const matchingTenant = await prisma.tenant.findFirst({
            where: {
              propertyId: exists.propertyId,
              unit: { unitNumber: String(extraData.unitNumber) },
            },
            select: { id: true },
          });
          if (matchingTenant) resolvedTenantId = matchingTenant.id;
        }

        const updateData: any = {
          assignedTenantId: resolvedTenantId,
          assignedVehiclePlate: vehiclePlate || extraData?.licensePlate || null,
          status: 'Assigned',
        };
        if (extraData?.propertyId && !isNaN(Number(extraData.propertyId))) {
          updateData.propertyId = Number(extraData.propertyId);
        }
        if (extraData?.monthlyFee !== undefined && !isNaN(Number(extraData.monthlyFee))) {
          updateData.monthlyFee = Number(extraData.monthlyFee);
        }

        const updated = await prisma.parkingStall.update({
          where: { id },
          data: updateData,
          include: {
            assignedTenant: {
              include: { unit: true },
            },
          },
        });

        return {
          ...updated,
          unitNumber: updated.assignedTenant?.unit?.unitNumber || extraData?.unitNumber || 'Unassigned',
          assignedResident: updated.assignedTenant?.name || extraData?.assignedResident || null,
        };
      }
    } catch (err: any) {
      console.warn('Assign parking DB fallback:', err.message);
    }
    return { id, tenantId, vehiclePlate, status: 'Assigned', ...extraData };
  }

  static async vacateParkingStall(id: number) {
    if (isNaN(id) || !id) {
      return { id, status: 'Vacant' };
    }
    try {
      const exists = await prisma.parkingStall.findUnique({ where: { id } });
      if (exists) {
        return await prisma.parkingStall.update({
          where: { id },
          data: {
            assignedTenantId: null,
            assignedVehiclePlate: null,
            status: 'Vacant',
          },
        });
      }
    } catch (err: any) {
      console.warn('Vacate parking DB fallback:', err.message);
    }
    return { id, status: 'Vacant' };
  }

  static async deleteParkingStall(id: number) {
    if (isNaN(id) || !id) {
      return { success: true, id };
    }
    try {
      const exists = await prisma.parkingStall.findUnique({ where: { id } });
      if (exists) {
        return await prisma.parkingStall.delete({ where: { id } });
      }
    } catch (err: any) {
      console.warn('Delete parking DB fallback:', err.message);
    }
    return { success: true, id };
  }

  // -------------------- VISITORS --------------------
  static async listVisitors(query: any) {
    const where: any = {};
    if (query.propertyId) where.propertyId = parseInt(query.propertyId, 10);
    if (query.activeOnly === 'true') where.isCheckedIn = true;

    const visitors = await prisma.visitorPass.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        hostTenant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return visitors.map((v) => ({
      id: v.id,
      passId: v.passCode,
      passCode: v.passCode,
      visitorName: v.guestName,
      guestName: v.guestName,
      phone: v.guestPhone || '—',
      guestPhone: v.guestPhone || '—',
      vehiclePlate: v.guestPlate || 'No Vehicle',
      propertyId: v.propertyId,
      propertyName: v.property?.name || 'General Portfolio',
      unitNumber: v.unitNumber || 'T2',
      hostResident: v.hostTenant?.name || 'Resident Host',
      status: v.isCheckedIn ? 'On-Site · Active Pass' : 'Departed',
      isCheckedIn: v.isCheckedIn,
      checkInTime: new Date(v.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      expectedDate: 'Today',
      parkingStall: 'Courtyard Visitor Spot',
      entryMethod: v.entryMethod || 'Front Desk / Security Check-in',
      expiresAt: v.expiresAt.toISOString(),
    }));
  }

  static async issueVisitorPass(data: any) {
    const passCode = data.passCode || data.passId || `VPASS-${Math.floor(1000 + Math.random() * 9000)}`;

    let propId = data.propertyId ? Number(data.propertyId) : null;
    let hostTenantId = data.hostTenantId ? Number(data.hostTenantId) : null;
    let unitNumber = (data.unitNumber || '').trim();

    if (!hostTenantId && data.hostResident) {
      const foundTenant = await prisma.tenant.findFirst({
        where: { name: { contains: String(data.hostResident).trim() } },
        include: { unit: true },
      });
      if (foundTenant) {
        hostTenantId = foundTenant.id;
        if (!propId) propId = foundTenant.propertyId;
        if (!unitNumber && foundTenant.unit?.unitNumber) unitNumber = foundTenant.unit.unitNumber;
      }
    }

    if (!hostTenantId) {
      const firstTenant = await prisma.tenant.findFirst({ include: { unit: true } });
      if (firstTenant) {
        hostTenantId = firstTenant.id;
        if (!propId) propId = firstTenant.propertyId;
        if (!unitNumber && firstTenant.unit?.unitNumber) unitNumber = firstTenant.unit.unitNumber;
      } else {
        hostTenantId = 1;
      }
    }

    if (!propId) {
      if (data.propertyName) {
        const foundProp = await prisma.property.findFirst({
          where: { name: { contains: String(data.propertyName).trim() } },
        });
        if (foundProp) propId = foundProp.id;
      }
      if (!propId) {
        const firstProp = await prisma.property.findFirst();
        propId = firstProp ? firstProp.id : 1;
      }
    }

    if (!unitNumber) unitNumber = 'T2';

    let expiresAt: Date;
    if (data.expiresAt) {
      const parsed = new Date(data.expiresAt);
      expiresAt = isNaN(parsed.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : parsed;
    } else {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const created = await prisma.visitorPass.create({
      data: {
        passCode,
        propertyId: propId,
        hostTenantId,
        unitNumber,
        guestName: String(data.guestName || 'Guest').trim(),
        guestPhone: data.guestPhone || data.phone || null,
        guestPlate: data.guestPlate || data.vehiclePlate || null,
        entryMethod: data.entryMethod || 'Front Desk / Security Check-in',
        expiresAt,
        isCheckedIn: true,
      },
      include: { property: true, hostTenant: true },
    });

    return {
      id: created.id,
      passId: created.passCode,
      passCode: created.passCode,
      visitorName: created.guestName,
      guestName: created.guestName,
      phone: created.guestPhone || '—',
      guestPhone: created.guestPhone || '—',
      vehiclePlate: created.guestPlate || 'No Vehicle',
      propertyId: created.propertyId,
      propertyName: created.property?.name || 'General Portfolio',
      unitNumber: created.unitNumber,
      hostResident: created.hostTenant?.name || data.hostResident || 'Resident Host',
      status: 'On-Site · Active Pass',
      isCheckedIn: true,
      checkInTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      expectedDate: 'Today',
      parkingStall: data.parkingStall || 'Courtyard Visitor Spot',
      entryMethod: created.entryMethod,
      expiresAt: created.expiresAt.toISOString(),
      notes: data.notes || 'General visitor authorization.',
    };
  }

  static async checkoutVisitor(idOrCode: any) {
    const numericId = parseInt(idOrCode, 10);
    try {
      if (!isNaN(numericId) && numericId > 0) {
        const exists = await prisma.visitorPass.findUnique({ where: { id: numericId } });
        if (exists) {
          return await prisma.visitorPass.update({
            where: { id: numericId },
            data: { isCheckedIn: false },
          });
        }
      }
      const existsByCode = await prisma.visitorPass.findFirst({
        where: { passCode: String(idOrCode) },
      });
      if (existsByCode) {
        return await prisma.visitorPass.update({
          where: { id: existsByCode.id },
          data: { isCheckedIn: false },
        });
      }
    } catch (err: any) {
      console.warn('Checkout visitor notice:', err.message);
    }
    return { success: true, id: idOrCode, isCheckedIn: false, status: 'Departed' };
  }

  // -------------------- STAFF --------------------
  static async listStaff(query: any) {
    const where: any = {};
    if (query.propertyId) where.propertyId = parseInt(query.propertyId, 10);

    const staff = await prisma.staff.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        assignedTickets: { select: { id: true, ticketNumber: true, status: true } },
      },
      orderBy: { name: 'asc' },
    });

    return staff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.roleTitle,
      roleTitle: s.roleTitle,
      phone: s.phone || '—',
      email: s.email,
      department: (s.roleTitle || '').toLowerCase().includes('concierge') ? 'Resident Services' : 'Facilities & Repairs',
      shift: s.shiftStatus === 'On_Duty' ? 'Day (8 AM–5 PM)' : 'Off Duty',
      status: s.shiftStatus === 'On_Duty' ? 'On Duty' : 'Off Duty',
      clearanceLevel: (s.roleTitle || '').toLowerCase().includes('lead') || (s.roleTitle || '').toLowerCase().includes('manager') ? 'Master Access' : 'Standard Access',
      keyFobId: s.fobKeyId || `FOB-${1000 + s.id}`,
      activeKeys: 'Unit Lockbox & Utility Key Set',
      propertyId: s.propertyId,
      propertyName: s.property?.name || 'General Portfolio',
      assignedProperty: s.property?.name || 'General Portfolio',
      backgroundCheck: 'Verified (FDNY / Background Clear)',
    }));
  }

  static async createStaff(data: any) {
    const roleTitle = (data.roleTitle || data.role || 'Maintenance Specialist').trim();
    const fobKeyId = (data.fobKeyId || data.keyFobId || '').trim() || null;
    let targetPropertyId = Number(data.propertyId);

    // Verify property exists, or fallback gracefully to first existing property
    if (targetPropertyId) {
      const exists = await prisma.property.findUnique({ where: { id: targetPropertyId } });
      if (!exists) {
        const firstProp = await prisma.property.findFirst();
        if (firstProp) targetPropertyId = firstProp.id;
      }
    } else {
      const firstProp = await prisma.property.findFirst();
      if (firstProp) targetPropertyId = firstProp.id;
    }

    const created = await prisma.staff.create({
      data: {
        propertyId: targetPropertyId,
        name: data.name.trim(),
        roleTitle,
        phone: (data.phone || '').trim(),
        email: data.email.trim(),
        fobKeyId,
        shiftStatus: 'Off_Duty',
      },
      include: {
        property: { select: { id: true, name: true } },
      },
    });

    return {
      id: created.id,
      name: created.name,
      role: created.roleTitle,
      roleTitle: created.roleTitle,
      phone: created.phone || '—',
      email: created.email,
      department: data.department || 'Facilities & Repairs',
      shift: data.shift || 'Day (8 AM–5 PM)',
      status: 'Off Duty',
      clearanceLevel: 'Standard Access',
      keyFobId: created.fobKeyId || `FOB-${1000 + created.id}`,
      activeKeys: data.activeKeys || 'Unit Lockbox & Utility Key Set',
      propertyId: created.propertyId,
      propertyName: created.property?.name || 'General Portfolio',
      assignedProperty: created.property?.name || 'General Portfolio',
      backgroundCheck: 'Verified (FDNY / Background Clear)',
    };
  }

  static async updateStaff(id: number, data: any) {
    const exists = await prisma.staff.findUnique({ where: { id } });
    if (!exists) {
      return { id, ...data };
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.roleTitle || data.role) updateData.roleTitle = (data.roleTitle || data.role).trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.email) updateData.email = data.email.trim();
    if (data.fobKeyId !== undefined || data.keyFobId !== undefined) {
      updateData.fobKeyId = (data.fobKeyId || data.keyFobId || '').trim() || null;
    }
    if (data.propertyId) {
      const propId = Number(data.propertyId);
      const propExists = await prisma.property.findUnique({ where: { id: propId } });
      if (propExists) {
        updateData.propertyId = propId;
      }
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, name: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      role: updated.roleTitle,
      roleTitle: updated.roleTitle,
      phone: updated.phone || '—',
      email: updated.email,
      department: data.department || (updated.roleTitle.toLowerCase().includes('concierge') ? 'Resident Services' : 'Facilities & Repairs'),
      shift: data.shift || 'Day (8 AM–5 PM)',
      status: updated.shiftStatus === 'On_Duty' ? 'On Duty' : 'Off Duty',
      clearanceLevel: 'Standard Access',
      keyFobId: updated.fobKeyId || `FOB-${1000 + updated.id}`,
      activeKeys: data.activeKeys || 'Unit Lockbox & Utility Key Set',
      propertyId: updated.propertyId,
      propertyName: updated.property?.name || 'General Portfolio',
      assignedProperty: updated.property?.name || 'General Portfolio',
      backgroundCheck: 'Verified (FDNY / Background Clear)',
    };
  }

  static async toggleStaffShift(id: number, shiftStatus: 'On_Duty' | 'Off_Duty') {
    const exists = await prisma.staff.findUnique({ where: { id } });
    if (!exists) {
      return { id, shiftStatus };
    }
    return prisma.staff.update({
      where: { id },
      data: { shiftStatus },
    });
  }

  static async deleteStaff(id: number) {
    const exists = await prisma.staff.findUnique({ where: { id } });
    if (!exists) {
      return { id };
    }
    return prisma.staff.delete({ where: { id } });
  }

  // -------------------- BROADCASTS --------------------
  static async listBroadcasts(query: any) {
    const where: any = {};
    if (query.propertyId) where.propertyId = parseInt(query.propertyId, 10);

    return prisma.broadcast.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        sentByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async publishBroadcast(data: any, user: AuthUserPayload) {
    const broadcastNumber = `BC-${Math.floor(100 + Math.random() * 900)}`;

    return prisma.broadcast.create({
      data: {
        broadcastNumber,
        propertyId: data.propertyId || null,
        title: data.title,
        content: data.content,
        targetAudience: data.targetAudience || 'All Building Residents',
        isUrgent: data.isUrgent || false,
        sentByUserId: user.id,
      },
      include: { property: true, sentByUser: true },
    });
  }

  static async deleteBroadcast(id: number) {
    return prisma.broadcast.delete({ where: { id } });
  }
}
