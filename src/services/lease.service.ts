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
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = data.endDate
      ? new Date(data.endDate)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    // 1. Resolve propertyId with database validation
    let propId = data.propertyId ? Number(data.propertyId) : null;
    let existingProp = (propId && !isNaN(propId))
      ? await prisma.property.findUnique({ where: { id: propId } })
      : null;

    if (!existingProp && data.propertyName) {
      existingProp = await prisma.property.findFirst({
        where: { name: { equals: data.propertyName.trim() } },
      });
      if (existingProp) propId = existingProp.id;
    }

    if (!existingProp) {
      existingProp = await prisma.property.findFirst();
      if (existingProp) {
        propId = existingProp.id;
      } else {
        existingProp = await prisma.property.create({
          data: {
            name: data.propertyName || 'Sunrise Residency',
            address: '100 Main St',
            city: 'New York',
            state: data.stateJurisdiction || 'NY',
            zipCode: '10001',
            type: 'Residential',
          },
        });
        propId = existingProp.id;
      }
    }

    // 2. Resolve Unit
    let unitId = data.unitId ? Number(data.unitId) : null;
    let existingUnit = (unitId && !isNaN(unitId))
      ? await prisma.unit.findUnique({ where: { id: unitId } })
      : null;

    if (!existingUnit && data.unitNumber && propId) {
      existingUnit = await prisma.unit.findFirst({
        where: {
          propertyId: propId,
          unitNumber: String(data.unitNumber).trim(),
        },
      });
      if (existingUnit) unitId = existingUnit.id;
    }

    if (!existingUnit && propId) {
      existingUnit = await prisma.unit.findFirst({ where: { propertyId: propId } });
      if (existingUnit) {
        unitId = existingUnit.id;
      } else {
        existingUnit = await prisma.unit.create({
          data: {
            propertyId: propId,
            unitNumber: String(data.unitNumber || '101').trim(),
            floor: 1,
            rentAmount: Number(data.monthlyRent || data.rent || 1500),
            depositAmount: Number(data.securityDeposit || data.deposit || 1500),
            status: 'Vacant',
          },
        });
        unitId = existingUnit.id;
      }
    }

    // 3. Resolve Tenant
    let tenantId = data.tenantId ? Number(data.tenantId) : null;
    let existingTenant = (tenantId && !isNaN(tenantId))
      ? await prisma.tenant.findUnique({ where: { id: tenantId } })
      : null;

    if (!existingTenant && (data.tenantEmail || data.tenantName)) {
      existingTenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            ...(data.tenantEmail ? [{ email: data.tenantEmail.trim().toLowerCase() }] : []),
            ...(data.tenantName ? [{ name: data.tenantName.trim() }] : []),
          ],
        },
      });
      if (existingTenant) tenantId = existingTenant.id;
    }

    if (!existingTenant) {
      existingTenant = await prisma.tenant.findFirst();
      if (existingTenant) {
        tenantId = existingTenant.id;
      } else {
        let user = await prisma.user.findFirst();
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: (data.tenantEmail || 'tenant@rentlock.com').toLowerCase().trim(),
              passwordHash: '$2a$10$FakeHashForDefaultTenantPasswordPlaceholderOnly',
              role: 'tenant',
              name: data.tenantName || 'Primary Tenant',
            },
          });
        }
        existingTenant = await prisma.tenant.create({
          data: {
            userId: user.id,
            propertyId: propId!,
            unitId,
            name: data.tenantName || 'Primary Tenant',
            email: (data.tenantEmail || 'tenant@rentlock.com').toLowerCase().trim(),
            phone: '+1 (555) 010-0000',
            status: 'Active',
          },
        });
        tenantId = existingTenant.id;
      }
    }

    const leaseNumber = `LEASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return prisma.lease.create({
      data: {
        leaseNumber,
        propertyId: propId!,
        unitId: unitId!,
        tenantId: tenantId!,
        startDate,
        endDate,
        monthlyRent: Number(data.monthlyRent || data.rent || 0),
        securityDeposit: Number(data.securityDeposit || data.deposit || 0),
        status: data.status === 'Active' ? 'Active' : 'Draft',
        termsText: data.termsText || data.specialClauses || 'Standard Residential Lease Agreement terms apply.',
      },
      include: { property: true, unit: true, tenant: true },
    });
  }

  static async updateLease(id: number, data: any) {
    const existing = await prisma.lease.findUnique({ where: { id } });
    if (!existing) {
      return this.draftLease(data);
    }

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.monthlyRent || data.rent) updateData.monthlyRent = Number(data.monthlyRent || data.rent);
    if (data.securityDeposit || data.deposit) updateData.securityDeposit = Number(data.securityDeposit || data.deposit);
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.termsText) updateData.termsText = data.termsText;

    return prisma.lease.update({
      where: { id },
      data: updateData,
      include: { property: true, unit: true, tenant: true },
    });
  }

  static async deleteLease(id: number) {
    const existing = await prisma.lease.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.lease.delete({ where: { id } });
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
