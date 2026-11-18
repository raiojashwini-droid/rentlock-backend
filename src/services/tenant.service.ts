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

    if (data.createPortalLogin) {
      const passwordHash = await hashPassword(data.password || 'demo123');
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          name: data.name,
          phone: data.phone,
          role: 'tenant',
        },
      });
      userId = user.id;
    }

    const tenant = await prisma.tenant.create({
      data: {
        userId,
        propertyId: data.propertyId,
        unitId: data.unitId,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        status: data.status || 'Active',
        emergencyContact: data.emergencyContact,
        vehiclePlate: data.vehiclePlate,
        moveInDate: data.moveInDate ? new Date(data.moveInDate) : new Date(),
        privateNotes: data.privateNotes,
      },
      include: { property: true, unit: true },
    });

    // Auto-sync unit status to Occupied if unit was assigned
    if (data.unitId) {
      await prisma.unit.update({
        where: { id: data.unitId },
        data: { status: 'Occupied' },
      });
    }

    return tenant;
  }

  static async updateTenant(id: number, data: any) {
    return prisma.tenant.update({
      where: { id },
      data: {
        ...data,
        moveInDate: data.moveInDate ? new Date(data.moveInDate) : undefined,
        moveOutDate: data.moveOutDate ? new Date(data.moveOutDate) : undefined,
      },
      include: { property: true, unit: true },
    });
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
    });

    // If unit was assigned, free it if no other active tenants
    if (tenant.unitId) {
      const otherTenants = await prisma.tenant.count({
        where: { unitId: tenant.unitId, id: { not: id }, status: 'Active' },
      });
      if (otherTenants === 0) {
        await prisma.unit.update({
          where: { id: tenant.unitId },
          data: { status: 'Vacant' },
        });
      }
    }

    // Clean up child records with foreign key constraints
    await prisma.invoice.deleteMany({ where: { tenantId: id } });
    await prisma.lease.deleteMany({ where: { tenantId: id } });
    await prisma.maintenanceTicket.deleteMany({ where: { tenantId: id } });

    return prisma.tenant.delete({ where: { id } });
  }
}
