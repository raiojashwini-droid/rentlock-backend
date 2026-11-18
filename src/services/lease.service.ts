import { prisma } from '../config/database.js';

export class LeaseService {
  static async listLeases(query: any) {
    const where: any = {};

    if (query.propertyId) {
      where.propertyId = parseInt(query.propertyId, 10);
    }
    if (query.status) {
      where.status = query.status;
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.lease.count({ where }),
      prisma.lease.findMany({
        where,
        skip,
        take: limit,
        include: {
          property: { select: { id: true, name: true, city: true } },
          unit: { select: { id: true, unitNumber: true } },
          tenant: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const enriched = items.map((l) => ({
      id: l.id,
      leaseNumber: l.leaseNumber,
      propertyId: l.propertyId,
      propertyName: l.property.name,
      unitId: l.unitId,
      unitNumber: l.unit.unitNumber,
      tenantId: l.tenantId,
      tenantName: l.tenant.name,
      tenantEmail: l.tenant.email,
      startDate: l.startDate,
      endDate: l.endDate,
      monthlyRent: Number(l.monthlyRent),
      rent: Number(l.monthlyRent),
      securityDeposit: Number(l.securityDeposit),
      deposit: Number(l.securityDeposit),
      status: l.status,
      signedAt: l.signedAt,
      countersignedAt: l.countersignedAt,
      createdAt: l.createdAt,
    }));

    return { items: enriched, total, page, limit };
  }

  static async getLeaseById(id: number) {
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: true,
        unit: true,
        tenant: true,
      },
    });

    if (!lease) throw new Error('Lease not found');
    return lease;
  }

  static async draftLease(data: any) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Conflict Invariant: No overlapping active lease on same unit
    const conflict = await prisma.lease.findFirst({
      where: {
        unitId: data.unitId,
        status: 'Active',
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
      },
    });

    if (conflict) {
      const err: any = new Error(`Unit already has an active overlapping lease contract (${conflict.leaseNumber}).`);
      err.statusCode = 409;
      err.code = 'RESOURCE_CONFLICT';
      throw err;
    }

    const leaseNumber = `LEASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return prisma.lease.create({
      data: {
        leaseNumber,
        propertyId: data.propertyId,
        unitId: data.unitId,
        tenantId: data.tenantId,
        startDate,
        endDate,
        monthlyRent: data.monthlyRent,
        securityDeposit: data.securityDeposit,
        status: 'Draft',
        termsText: data.termsText || 'Standard Residential Lease Agreement terms apply.',
      },
      include: { property: true, unit: true, tenant: true },
    });
  }

  static async signLease(id: number, signatureData: string, legalName: string) {
    const lease = await prisma.lease.findUnique({ where: { id } });
    if (!lease) throw new Error('Lease contract not found');

    const updated = await prisma.lease.update({
      where: { id },
      data: {
        status: 'Active',
        signedAt: new Date(),
        countersignedAt: new Date(),
      },
      include: { unit: true, tenant: true },
    });

    // Auto-synchronize Unit status to Occupied
    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: 'Occupied' },
    });

    return updated;
  }

  static async terminateLease(id: number, terminationDate: string, reason: string) {
    const lease = await prisma.lease.findUnique({ where: { id } });
    if (!lease) throw new Error('Lease contract not found');

    const updated = await prisma.lease.update({
      where: { id },
      data: {
        status: 'Terminated',
        endDate: new Date(terminationDate),
      },
    });

    // Free unit to Vacant
    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: 'Vacant' },
    });

    return updated;
  }
}
