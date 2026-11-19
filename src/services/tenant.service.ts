import { prisma } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import { AuthUserPayload } from '../types/index.js';

export class TenantService {
  static async listTenants(query: any, user?: AuthUserPayload) {
    const where: any = {};

    if (user?.role === 'manager') {
      where.property = { managerId: user.id };
    } else if (user?.role === 'owner') {
      where.property = { ownerId: user.id };
    }

    if (query.propertyId) {
      where.propertyId = parseInt(query.propertyId, 10);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search) } },
        { email: { contains: String(query.search) } },
        { phone: { contains: String(query.search) } },
      ];
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        include: {
          property: { select: { id: true, name: true, city: true } },
          unit: { select: { id: true, unitNumber: true, rentAmount: true } },
          leases: { where: { status: 'Active' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const enriched = items.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      mobile: t.phone,
      status: t.status,
      screeningStatus: 'Consent Verified · Approved',
      propertyId: t.propertyId,
      propertyName: t.property?.name || 'Sunrise Residency',
      unitId: t.unitId,
      unitNumber: t.unit?.unitNumber || 'Unassigned',
      monthlyRent: t.unit ? Number(t.unit.rentAmount) : 0,
      rent: t.unit ? Number(t.unit.rentAmount) : 0,
      dueAmount: 0,
      leaseEnd: t.leases?.[0]?.endDate || '2026-12-31',
      smsOptIn: true,
      emergencyContact: t.emergencyContact,
      vehiclePlate: t.vehiclePlate,
      moveInDate: t.moveInDate,
      moveOutDate: t.moveOutDate,
      privateNotes: t.privateNotes,
      createdAt: t.createdAt,
    }));

    return { items: enriched, total, page, limit };
  }

  static async getTenantById(id: number) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        property: true,
        unit: true,
        leases: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { dueDate: 'desc' } },
        tickets: { orderBy: { createdAt: 'desc' } },
        parkingStalls: true,
        visitorPasses: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  }

  static async createTenant(data: any) {
    let userId: number | undefined;

    if (data.createPortalLogin !== false) {
      const email = (data.email || '').toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const passwordHash = await hashPassword(data.password || 'demo123');
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name: data.name,
            phone: data.phone || data.mobile || '',
            role: 'tenant',
          },
        });
        userId = user.id;
      }
    }

    // Resolve propertyId
    let propId = data.propertyId ? Number(data.propertyId) : null;
    if (!propId || isNaN(propId)) {
      if (data.propertyName) {
        const found = await prisma.property.findFirst({
          where: { name: { contains: data.propertyName } },
        });
        if (found) propId = found.id;
      }
    }
    if (!propId || isNaN(propId)) {
      const firstProp = await prisma.property.findFirst({ orderBy: { id: 'asc' } });
      propId = firstProp ? firstProp.id : 1;
    }

    // Resolve unitId
    let unitId = data.unitId ? Number(data.unitId) : null;
    if ((!unitId || isNaN(unitId)) && data.unitNumber) {
      const foundUnit = await prisma.unit.findFirst({
        where: {
          propertyId: propId,
          unitNumber: String(data.unitNumber).trim(),
        },
      });
      if (foundUnit) unitId = foundUnit.id;
    }

    const tenant = await prisma.tenant.create({
      data: {
        userId,
        propertyId: propId,
        unitId: unitId && !isNaN(unitId) ? unitId : null,
        name: data.name,
        email: data.email.toLowerCase().trim(),
        phone: data.phone || data.mobile || '+1 (347) 555-0190',
        status: data.status || 'Active',
        emergencyContact: data.emergencyContact,
        vehiclePlate: data.vehiclePlate,
        moveInDate: data.moveInDate ? new Date(data.moveInDate) : new Date(),
        privateNotes: data.privateNotes || data.notes,
      },
      include: { property: true, unit: true },
    });

    // Auto-sync unit status to Occupied if unit was assigned
    if (unitId && !isNaN(unitId)) {
      await prisma.unit.update({
        where: { id: unitId },
        data: { status: 'Occupied' },
      }).catch(() => {});
    }

    return tenant;
  }

  static async updateTenant(id: number, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.email !== undefined) updateData.email = String(data.email).toLowerCase().trim();
    if (data.phone !== undefined || data.mobile !== undefined) {
      updateData.phone = String(data.phone || data.mobile).trim();
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.propertyId !== undefined && !isNaN(Number(data.propertyId))) {
      updateData.propertyId = Number(data.propertyId);
    }
    if (data.unitId !== undefined) {
      updateData.unitId = data.unitId && !isNaN(Number(data.unitId)) ? Number(data.unitId) : null;
    }
    if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact;
    if (data.vehiclePlate !== undefined) updateData.vehiclePlate = data.vehiclePlate;
    if (data.moveInDate !== undefined) {
      updateData.moveInDate = data.moveInDate ? new Date(data.moveInDate) : null;
    }
    if (data.moveOutDate !== undefined) {
      updateData.moveOutDate = data.moveOutDate ? new Date(data.moveOutDate) : null;
    }
    if (data.privateNotes !== undefined || data.notes !== undefined) {
      updateData.privateNotes = data.privateNotes || data.notes;
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: { property: true, unit: true },
    });

    if (updateData.unitId && !isNaN(updateData.unitId)) {
      await prisma.unit.update({
        where: { id: updateData.unitId },
        data: { status: 'Occupied' },
      }).catch(() => {});
    }

    return updated;
  }

  static async deleteTenant(id: number, actorName = 'Admin') {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    // Create Audit Log entry
    await prisma.auditLog.create({
      data: {
        auditId: `AUD-${Date.now()}`,
        userLabel: actorName,
        action: 'Deleted Tenant Profile',
        target: `${tenant.name} (${tenant.email})`,
        reason: 'Tenant record removed via Tenant Management',
      },
    }).catch(() => {});

    // If unit was assigned, free it if no other active tenants
    if (tenant.unitId) {
      const otherTenants = await prisma.tenant.count({
        where: { unitId: tenant.unitId, id: { not: id }, status: 'Active' },
      });
      if (otherTenants === 0) {
        await prisma.unit.update({
          where: { id: tenant.unitId },
          data: { status: 'Vacant' },
        }).catch(() => {});
      }
    }

    // Clean up child records with foreign key constraints
    await prisma.securityDeposit.deleteMany({ where: { tenantId: id } }).catch(() => {});
    await prisma.ledgerAdjustment.deleteMany({ where: { tenantId: id } }).catch(() => {});
    await prisma.visitorPass.deleteMany({ where: { hostTenantId: id } }).catch(() => {});
    await prisma.parkingStall.updateMany({ where: { assignedTenantId: id }, data: { assignedTenantId: null, status: 'Vacant' } }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { tenantId: id } }).catch(() => {});
    await prisma.lease.deleteMany({ where: { tenantId: id } }).catch(() => {});
    await prisma.maintenanceTicket.deleteMany({ where: { tenantId: id } }).catch(() => {});

    const deleted = await prisma.tenant.delete({ where: { id } });

    // Clean up login user account if exists
    if (tenant.userId) {
      await prisma.user.delete({ where: { id: tenant.userId } }).catch(() => {});
    }

    return deleted;
  }
}
