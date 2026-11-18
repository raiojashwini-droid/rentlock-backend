import { prisma } from '../config/database.js';

export class UnitService {
  static async listUnits(query: any) {
    const where: any = {};

    if (query.propertyId) {
      where.propertyId = parseInt(query.propertyId, 10);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { unitNumber: { contains: String(query.search) } },
        { property: { name: { contains: String(query.search) } } },
      ];
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where,
        skip,
        take: limit,
        include: {
          property: { select: { id: true, name: true, city: true, state: true } },
          tenants: { select: { id: true, name: true, email: true, phone: true, status: true } },
          leases: { where: { status: 'Active' }, take: 1 },
        },
        orderBy: [{ propertyId: 'asc' }, { unitNumber: 'asc' }],
      }),
    ]);

    const enrichedItems = items.map((u) => ({
      ...u,
      propertyName: u.property?.name || 'General Portfolio',
      tenant: u.tenants?.[0]?.name || null,
      size: u.sqft,
      rent: Number(u.rentAmount),
      deposit: Number(u.depositAmount),
    }));

    return { items: enrichedItems, total, page, limit };
  }

  static async getUnitById(id: number) {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        property: true,
        tenants: true,
        leases: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { dueDate: 'desc' }, take: 10 },
        tickets: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!unit) throw new Error('Unit not found');

    return {
      ...unit,
      propertyName: unit.property?.name || 'General Portfolio',
      tenant: unit.tenants?.[0]?.name || null,
      size: unit.sqft,
      rent: Number(unit.rentAmount),
      deposit: Number(unit.depositAmount),
    };
  }

  static async createUnit(data: any) {
    let propId = data.propertyId ? parseInt(data.propertyId, 10) : null;
    if (!propId || isNaN(propId)) {
      const firstProp = await prisma.property.findFirst({ orderBy: { id: 'asc' } });
      if (firstProp) {
        propId = firstProp.id;
      } else {
        const newProp = await prisma.property.create({
          data: {
            name: 'Sunrise Residency',
            address: '142 Ocean Avenue',
            city: 'Brooklyn',
            state: 'NY',
            zipCode: '11215',
          },
        });
        propId = newProp.id;
      }
    }

    const rent = Number(data.rentAmount || data.rent || 2100);
    const deposit = Number(data.depositAmount || data.deposit || rent);
    const sqft = Number(data.sqft || data.size || 900);
    const floor = Number(data.floor || 1);
    const bedrooms = Number(data.bedrooms || 1);
    const bathrooms = Number(data.bathrooms || 1);

    return prisma.unit.create({
      data: {
        propertyId: propId,
        unitNumber: String(data.unitNumber || 'A-101'),
        floor,
        bedrooms,
        bathrooms,
        sqft,
        rentAmount: rent,
        depositAmount: deposit,
        status: data.status || 'Vacant',
      },
      include: { property: true },
    });
  }

  static async updateUnit(id: number, data: any) {
    const validData: any = {};
    if (data.unitNumber !== undefined) validData.unitNumber = String(data.unitNumber);
    if (data.floor !== undefined) validData.floor = Number(data.floor);
    if (data.bedrooms !== undefined || data.beds !== undefined) validData.bedrooms = Number(data.bedrooms || data.beds);
    if (data.bathrooms !== undefined || data.baths !== undefined) validData.bathrooms = Number(data.bathrooms || data.baths);
    if (data.sqft !== undefined || data.size !== undefined) validData.sqft = Number(data.sqft || data.size);
    if (data.rentAmount !== undefined || data.rent !== undefined) validData.rentAmount = Number(data.rentAmount || data.rent);
    if (data.depositAmount !== undefined || data.deposit !== undefined) validData.depositAmount = Number(data.depositAmount || data.deposit);
    if (data.status !== undefined) {
      const allowed = ['Occupied', 'Vacant', 'Maintenance', 'Reserved'];
      if (allowed.includes(data.status)) {
        validData.status = data.status;
      }
    }
    if (data.propertyId !== undefined) validData.propertyId = Number(data.propertyId);

    return prisma.unit.update({
      where: { id },
      data: validData,
      include: { property: true },
    });
  }

  static async deleteUnit(id: number) {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        leases: true,
        tenants: true,
        invoices: true,
        tickets: true,
      },
    });

    if (!unit) {
      return { id };
    }

    // Cascade delete/clean child records that have foreign keys
    await prisma.invoice.deleteMany({ where: { unitId: id } });
    await prisma.lease.deleteMany({ where: { unitId: id } });
    await prisma.maintenanceTicket.deleteMany({ where: { unitId: id } });
    await prisma.tenant.updateMany({
      where: { unitId: id },
      data: { unitId: null },
    });

    return prisma.unit.delete({ where: { id } });
  }
}
