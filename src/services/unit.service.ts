import { prisma } from '../config/database.js';

export class UnitService {
  private static tableInitialized = false;

  private static async ensureUnitTypeTable() {
    if (this.tableInitialized) return;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS unittype (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(191) UNIQUE NOT NULL,
          createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        );
      `);
      this.tableInitialized = true;
    } catch (err: any) {
      console.warn('[UnitService] ensureUnitTypeTable error:', err.message);
    }
  }

  static async getUnitTypes(): Promise<string[]> {
    await this.ensureUnitTypeTable();
    try {
      const rows: any = await prisma.$queryRawUnsafe(`
        SELECT name FROM unittype ORDER BY id ASC;
      `);
      if (Array.isArray(rows)) {
        return rows.map((r: any) => r.name);
      }
    } catch (err: any) {
      console.warn('[UnitService] getUnitTypes query error:', err.message);
    }
    return [];
  }

  static async addUnitType(name: string): Promise<string[]> {
    await this.ensureUnitTypeTable();
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Unit type name is required');

    try {
      await prisma.$executeRawUnsafe(`
        INSERT IGNORE INTO unittype (name) VALUES (?);
      `, trimmed);
    } catch (err: any) {
      console.warn('[UnitService] addUnitType error:', err.message);
    }

    return this.getUnitTypes();
  }

  static async removeUnitType(name: string): Promise<string[]> {
    await this.ensureUnitTypeTable();
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Unit type name is required');

    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM unittype WHERE name = ?;
      `, trimmed);
    } catch (err: any) {
      console.warn('[UnitService] removeUnitType error:', err.message);
    }

    return this.getUnitTypes();
  }

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

    const enrichedItems = items.map((u) => {
      const beds = u.bedrooms ?? 1;
      const baths = Number(u.bathrooms ?? 1);
      return {
        ...u,
        propertyName: u.property?.name || 'General Portfolio',
        tenant: u.tenants?.[0]?.name || null,
        size: u.sqft,
        rent: Number(u.rentAmount),
        deposit: Number(u.depositAmount),
        beds,
        baths,
        bhk: `${beds} BD / ${baths} BA`,
      };
    });

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

    const beds = unit.bedrooms ?? 1;
    const baths = Number(unit.bathrooms ?? 1);

    return {
      ...unit,
      propertyName: unit.property?.name || 'General Portfolio',
      tenant: unit.tenants?.[0]?.name || null,
      size: unit.sqft,
      rent: Number(unit.rentAmount),
      deposit: Number(unit.depositAmount),
      beds,
      baths,
      bhk: `${beds} BD / ${baths} BA`,
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
    const bedrooms = Number(data.bedrooms ?? data.beds ?? 1);
    const bathrooms = Number(data.bathrooms ?? data.baths ?? 1);

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
