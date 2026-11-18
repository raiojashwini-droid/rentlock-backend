import { prisma } from '../config/database.js';
import { AuthUserPayload } from '../types/index.js';

export class PropertyService {
  static async listProperties(query: any, user?: AuthUserPayload) {
    const where: any = {};

    // Persona-based data boundary
    if (user?.role === 'manager') {
      where.managerId = user.id;
    } else if (user?.role === 'owner') {
      where.ownerId = user.id;
    }

    if (query.city) {
      where.city = { contains: String(query.city) };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search) } },
        { address: { contains: String(query.search) } },
        { city: { contains: String(query.search) } },
      ];
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        include: {
          manager: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          units: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const enriched = properties.map((p) => {
      const totalUnits = p.units.length;
      const occupiedUnits = p.units.filter((u) => u.status === 'Occupied').length;
      const occupancyRate = totalUnits > 0 ? Number(((occupiedUnits / totalUnits) * 100).toFixed(1)) : 0;
      const monthlyRevenue = p.units
        .filter((u) => u.status === 'Occupied')
        .reduce((sum, u) => sum + Number(u.rentAmount || 0), 0);

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        address: p.address,
        city: p.city,
        state: p.state,
        zipCode: p.zipCode,
        yearBuilt: p.yearBuilt,
        imageUrl: p.imageUrl,
        amenities: p.amenities,
        totalUnits,
        occupiedUnits,
        occupancyRate,
        monthlyRevenue,
        manager: p.manager?.name || 'Sarah Jenkins',
        managerDetails: p.manager,
        owner: p.owner?.name || 'Claire Bennett',
        ownerDetails: p.owner,
        code: `PR-${String(p.id).padStart(2, '0')}`,
        category: p.type,
        createdAt: p.createdAt,
      };
    });

    return { items: enriched, total, page, limit };
  }

  static async getPropertyById(id: number) {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true, phone: true } },
        owner: { select: { id: true, name: true, email: true, phone: true } },
        units: {
          include: {
            tenants: { select: { id: true, name: true, email: true, phone: true, status: true } },
          },
        },
        documents: true,
      },
    });

    if (!property) throw new Error('Property not found');

    const totalUnits = property.units.length;
    const occupiedUnits = property.units.filter((u) => u.status === 'Occupied').length;
    const occupancyRate = totalUnits > 0 ? Number(((occupiedUnits / totalUnits) * 100).toFixed(1)) : 0;
    const monthlyRevenue = property.units
      .filter((u) => u.status === 'Occupied')
      .reduce((sum, u) => sum + Number(u.rentAmount || 0), 0);

    return {
      ...property,
      manager: property.manager?.name || 'Sarah Jenkins',
      owner: property.owner?.name || 'Claire Bennett',
      totalUnits,
      occupiedUnits,
      occupancyRate,
      monthlyRevenue,
    };
  }

  static async createProperty(data: any) {
    let resolvedManagerId = data.managerId ? Number(data.managerId) : undefined;
    if (!resolvedManagerId && data.manager) {
      const mgrName = String(data.manager).trim();
      const mgr = await prisma.user.findFirst({
        where: {
          role: 'manager',
          OR: [
            { name: mgrName },
            { email: mgrName.toLowerCase() },
          ],
        },
        select: { id: true },
      });
      if (mgr) resolvedManagerId = mgr.id;
    }

    let resolvedOwnerId = data.ownerId && !isNaN(Number(data.ownerId)) && Number(data.ownerId) < 1000000000000 ? Number(data.ownerId) : undefined;
    if (!resolvedOwnerId && data.owner) {
      const ownName = String(data.owner).trim();
      const ownerUser = await prisma.user.findFirst({
        where: {
          role: 'owner',
          OR: [
            { name: ownName },
            { email: ownName.toLowerCase() },
          ],
        },
        select: { id: true },
      });
      if (ownerUser) resolvedOwnerId = ownerUser.id;
    }

    const property = await prisma.property.create({
      data: {
        name: data.name,
        type: data.type || 'Multi-Family Residential',
        address: data.address || `${data.street || '123 Main St'}, ${data.city || 'Brooklyn'}, ${data.state || 'NY'}`,
        city: data.city || 'Brooklyn',
        state: data.state || 'NY',
        zipCode: data.zipCode || data.zip || '11215',
        yearBuilt: data.yearBuilt ? Number(data.yearBuilt) : undefined,
        imageUrl: data.imageUrl,
        amenities: data.amenities || [],
        managerId: resolvedManagerId,
        ownerId: resolvedOwnerId,
        accessNotes: data.accessNotes,
      },
    });

    if (Array.isArray(data.units) && data.units.length > 0) {
      for (const u of data.units) {
        await prisma.unit.create({
          data: {
            propertyId: property.id,
            unitNumber: String(u.unitNumber || u.number || '101'),
            floor: Number(u.floor) || 1,
            bedrooms: Number(u.bedrooms || u.beds || 1),
            bathrooms: Number(u.bathrooms || u.baths || 1),
            sqft: Number(u.sqft || u.size) || 850,
            rentAmount: Number(u.rentAmount || u.rent) || 2000,
            depositAmount: Number(u.depositAmount || u.deposit || u.rentAmount || u.rent) || 2000,
            status: u.status || 'Vacant',
          },
        }).catch(() => {});
      }
    }

    return property;
  }

  static async updateProperty(id: number, data: any) {
    const updateData: any = { ...data };

    if (!updateData.managerId && updateData.manager) {
      const mgrName = String(updateData.manager).trim();
      const mgr = await prisma.user.findFirst({
        where: {
          role: 'manager',
          OR: [
            { name: mgrName },
            { email: mgrName.toLowerCase() },
          ],
        },
        select: { id: true },
      });
      if (mgr) {
        updateData.managerId = mgr.id;
      }
    }

    if (!updateData.ownerId && updateData.owner) {
      const ownName = String(updateData.owner).trim();
      const ownerUser = await prisma.user.findFirst({
        where: {
          role: 'owner',
          OR: [
            { name: ownName },
            { email: ownName.toLowerCase() },
          ],
        },
        select: { id: true },
      });
      if (ownerUser) {
        updateData.ownerId = ownerUser.id;
      }
    }

    delete updateData.manager;
    delete updateData.owner;
    delete updateData.financials;
    delete updateData.requirements;

    return prisma.property.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteProperty(id: number) {
    // Clean up any child records with foreign keys
    const units = await prisma.unit.findMany({
      where: { propertyId: id },
      select: { id: true },
    });
    const unitIds = units.map((u) => u.id);

    if (unitIds.length > 0) {
      await prisma.invoice.deleteMany({ where: { unitId: { in: unitIds } } });
      await prisma.maintenanceTicket.deleteMany({ where: { unitId: { in: unitIds } } });
      await prisma.lease.deleteMany({ where: { unitId: { in: unitIds } } });
      await prisma.unit.deleteMany({ where: { id: { in: unitIds } } });
    }
    await prisma.maintenanceTicket.deleteMany({ where: { propertyId: id } });
    await prisma.lease.deleteMany({ where: { propertyId: id } });
    await prisma.tenant.deleteMany({ where: { propertyId: id } });
    await prisma.propertyDocument.deleteMany({ where: { propertyId: id } });

    return prisma.property.delete({ where: { id } });
  }

  static async uploadDocument(propertyId: number, docData: { name: string; category: string; fileUrl: string; uploadedBy: string }) {
    return prisma.propertyDocument.create({
      data: {
        propertyId,
        name: docData.name,
        category: docData.category,
        fileUrl: docData.fileUrl,
        uploadedBy: docData.uploadedBy,
      },
    });
  }

  static async listDocuments(propertyId: number) {
    return prisma.propertyDocument.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
