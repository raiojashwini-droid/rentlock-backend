import { prisma } from '../config/database.js';
import { AuthUserPayload } from '../types/index.js';
import { hashPassword } from '../utils/password.js';

export class PropertyService {
  static async listProperties(query: any, user?: AuthUserPayload) {
    const andClauses: any[] = [];

    // Persona-based data boundary: Ensure each owner strictly sees only their own properties
    if (user?.role === 'manager') {
      const mgrConditions: any[] = [{ managerId: user.id }];
      if (user.name) {
        mgrConditions.push({ accessNotes: { contains: `[MGR:${user.name}]` } });
        mgrConditions.push({ manager: { name: user.name } });
      }
      if (user.email) {
        mgrConditions.push({ manager: { email: user.email.toLowerCase() } });
      }
      andClauses.push({ OR: mgrConditions });
    } else if (user?.role === 'owner') {
      const ownerConditions: any[] = [{ ownerId: user.id }];
      if (user.name) {
        ownerConditions.push({ accessNotes: { contains: `[OWNER:${user.name}]` } });
        ownerConditions.push({ accessNotes: { contains: `[OWNER:${user.name} ` } });
        ownerConditions.push({ owner: { name: user.name } });
      }
      if (user.email) {
        ownerConditions.push({ owner: { email: user.email.toLowerCase() } });
      }
      andClauses.push({ OR: ownerConditions });
    }

    if (query.city) {
      andClauses.push({ city: { contains: String(query.city) } });
    }

    if (query.search) {
      andClauses.push({
        OR: [
          { name: { contains: String(query.search) } },
          { address: { contains: String(query.search) } },
          { city: { contains: String(query.search) } },
        ],
      });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

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

      const notes = p.accessNotes || '';
      const customCode = notes.match(/\[CODE:(.*?)\]/)?.[1];
      const customCategory = notes.match(/\[CATEGORY:(.*?)\]/)?.[1];
      const customPortfolio = notes.match(/\[PORTFOLIO:(.*?)\]/)?.[1];
      const customMgr = notes.match(/\[MGR:(.*?)\]/)?.[1];
      const customOwner = notes.match(/\[OWNER:(.*?)\]/)?.[1];

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
        image: p.imageUrl || null,
        amenities: p.amenities,
        totalUnits,
        occupiedUnits,
        occupancyRate,
        monthlyRevenue,
        manager: p.manager?.name || customMgr || undefined,
        managerDetails: p.manager,
        owner: p.owner?.name || customOwner || undefined,
        ownerDetails: p.owner,
        code: customCode || `PR-${String(p.id).padStart(2, '0')}`,
        category: customCategory || p.type,
        portfolioGroup: customPortfolio || 'Brooklyn & Queens',
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

    const notes = property.accessNotes || '';
    const customCode = notes.match(/\[CODE:(.*?)\]/)?.[1];
    const customCategory = notes.match(/\[CATEGORY:(.*?)\]/)?.[1];
    const customPortfolio = notes.match(/\[PORTFOLIO:(.*?)\]/)?.[1];
    const customMgr = notes.match(/\[MGR:(.*?)\]/)?.[1];
    const customOwner = notes.match(/\[OWNER:(.*?)\]/)?.[1];

    return {
      ...property,
      manager: property.manager?.name || customMgr || undefined,
      owner: property.owner?.name || customOwner || undefined,
      code: customCode || `PR-${String(property.id).padStart(2, '0')}`,
      category: customCategory || property.type,
      portfolioGroup: customPortfolio || 'Brooklyn & Queens',
      totalUnits,
      occupiedUnits,
      occupancyRate,
      monthlyRevenue,
    };
  }

  static async createProperty(data: any) {
    let resolvedManagerId: number | undefined = undefined;

    // 1. Verify managerId if provided exists in DB as manager
    if (data.managerId && !isNaN(Number(data.managerId)) && Number(data.managerId) < 1000000000000) {
      const checkMgr = await prisma.user.findFirst({
        where: { id: Number(data.managerId), role: 'manager' },
        select: { id: true },
      });
      if (checkMgr) resolvedManagerId = checkMgr.id;
    }

    // 2. If not resolved yet, check manager name or email
    if (!resolvedManagerId && data.manager) {
      const cleanMgrName = String(data.manager).trim();
      if (cleanMgrName && cleanMgrName.toLowerCase() !== 'unassigned' && cleanMgrName.toLowerCase() !== 'no manager') {
        let mgrUser = await prisma.user.findFirst({
          where: {
            role: 'manager',
            OR: [
              { name: { equals: cleanMgrName } },
              { email: { equals: cleanMgrName.toLowerCase() } },
              { name: { contains: cleanMgrName } },
            ],
          },
          select: { id: true },
        });

        // Auto-create manager in DB if not found
        if (!mgrUser) {
          const cleanEmail = cleanMgrName.includes('@')
            ? cleanMgrName.toLowerCase()
            : `${cleanMgrName.toLowerCase().replace(/[^a-z0-9]/g, '')}@rentlock.com`;
          const passwordHash = await hashPassword('demo123');
          mgrUser = await prisma.user.upsert({
            where: { email: cleanEmail },
            update: { role: 'manager', name: cleanMgrName },
            create: {
              name: cleanMgrName,
              email: cleanEmail,
              role: 'manager',
              passwordHash,
            },
            select: { id: true },
          }).catch(() => null);
        }

        if (mgrUser) resolvedManagerId = mgrUser.id;
      }
    }

    let resolvedOwnerId: number | undefined = undefined;
    if (data.owner) {
      const cleanOwnName = String(data.owner).replace(/\(.*?\)/g, '').trim();
      let ownerUser = await prisma.user.findFirst({
        where: {
          role: 'owner',
          OR: [
            { name: { equals: cleanOwnName } },
            { email: { equals: cleanOwnName.toLowerCase() } },
            { name: { contains: cleanOwnName } },
          ],
        },
        select: { id: true },
      });

      // If owner user does not exist in DB yet, auto-create user account
      if (!ownerUser && cleanOwnName && cleanOwnName.toLowerCase() !== 'unassigned') {
        const cleanEmail = cleanOwnName.includes('@')
          ? cleanOwnName.toLowerCase()
          : `${cleanOwnName.toLowerCase().replace(/[^a-z0-9]/g, '')}@rentlock.com`;
        const passwordHash = await hashPassword('demo123');
        ownerUser = await prisma.user.upsert({
          where: { email: cleanEmail },
          update: { role: 'owner', name: cleanOwnName },
          create: {
            name: cleanOwnName,
            email: cleanEmail,
            role: 'owner',
            passwordHash,
          },
          select: { id: true },
        }).catch(() => null);
      }

      if (ownerUser) resolvedOwnerId = ownerUser.id;
    }

    if (!resolvedOwnerId && data.ownerId && !isNaN(Number(data.ownerId)) && Number(data.ownerId) < 1000000000000) {
      const checkUser = await prisma.user.findFirst({
        where: { id: Number(data.ownerId), role: 'owner' },
        select: { id: true },
      });
      if (checkUser) resolvedOwnerId = checkUser.id;
    }

    const cleanOwnerTag = data.owner ? String(data.owner).replace(/\(.*?\)/g, '').trim() : '';
    const metaTags = [];
    if (data.code) metaTags.push(`[CODE:${data.code}]`);
    if (data.category) metaTags.push(`[CATEGORY:${data.category}]`);
    if (data.portfolioGroup) metaTags.push(`[PORTFOLIO:${data.portfolioGroup}]`);
    if (data.manager) metaTags.push(`[MGR:${data.manager}]`);
    if (cleanOwnerTag) metaTags.push(`[OWNER:${cleanOwnerTag}]`);
    const packedNotes = [data.accessNotes, ...metaTags].filter(Boolean).join(' ');

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
        accessNotes: packedNotes || undefined,
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

    const stallsInput = data.parkingStalls || data.stalls;
    if (Array.isArray(stallsInput) && stallsInput.length > 0) {
      for (const s of stallsInput) {
        let stallType = 'Standard_Covered';
        const rawType = (s.spotType || s.stallType || '').toLowerCase();
        if (rawType.includes('ev')) stallType = 'EV_Charging';
        else if (rawType.includes('visitor')) stallType = 'Visitor_Reserved';
        else if (rawType.includes('handicap')) stallType = 'Handicap';

        await prisma.parkingStall.create({
          data: {
            propertyId: property.id,
            stallNumber: String(s.spotNumber || s.stallNumber || 'P-101'),
            stallType: stallType as any,
            monthlyFee: Number(s.monthlyFee) || 150,
            status: (s.assignedResident || (s.unitNumber && s.unitNumber !== 'Unassigned')) ? 'Assigned' : 'Vacant',
            assignedVehiclePlate: s.licensePlate && s.licensePlate !== '—' ? s.licensePlate : (s.assignedVehiclePlate || null),
          },
        }).catch((err) => console.warn('[PropertyService] parkingStall create error:', err.message));
      }
    }

    return property;
  }

  static async updateProperty(id: number, data: any) {
    let resolvedManagerId: number | undefined = undefined;

    // 1. Verify managerId if provided exists in DB as manager
    if (data.managerId && !isNaN(Number(data.managerId)) && Number(data.managerId) < 1000000000000) {
      const checkMgr = await prisma.user.findFirst({
        where: { id: Number(data.managerId), role: 'manager' },
        select: { id: true },
      });
      if (checkMgr) resolvedManagerId = checkMgr.id;
    }

    // 2. If not resolved yet, check manager name or email
    if (!resolvedManagerId && data.manager) {
      const cleanMgrName = String(data.manager).trim();
      if (cleanMgrName && cleanMgrName.toLowerCase() !== 'unassigned' && cleanMgrName.toLowerCase() !== 'no manager') {
        let mgrUser = await prisma.user.findFirst({
          where: {
            role: 'manager',
            OR: [
              { name: { equals: cleanMgrName } },
              { email: { equals: cleanMgrName.toLowerCase() } },
              { name: { contains: cleanMgrName } },
            ],
          },
          select: { id: true },
        });

        // Auto-create manager in DB if not found
        if (!mgrUser) {
          const cleanEmail = cleanMgrName.includes('@')
            ? cleanMgrName.toLowerCase()
            : `${cleanMgrName.toLowerCase().replace(/[^a-z0-9]/g, '')}@rentlock.com`;
          const passwordHash = await hashPassword('demo123');
          mgrUser = await prisma.user.upsert({
            where: { email: cleanEmail },
            update: { role: 'manager', name: cleanMgrName },
            create: {
              name: cleanMgrName,
              email: cleanEmail,
              role: 'manager',
              passwordHash,
            },
            select: { id: true },
          }).catch(() => null);
        }

        if (mgrUser) resolvedManagerId = mgrUser.id;
      }
    }

    let resolvedOwnerId: number | undefined = undefined;
    if (data.owner) {
      const cleanOwnName = String(data.owner).replace(/\(.*?\)/g, '').trim();
      let ownerUser = await prisma.user.findFirst({
        where: {
          role: 'owner',
          OR: [
            { name: { equals: cleanOwnName } },
            { email: { equals: cleanOwnName.toLowerCase() } },
            { name: { contains: cleanOwnName } },
          ],
        },
        select: { id: true },
      });

      if (!ownerUser && cleanOwnName && cleanOwnName.toLowerCase() !== 'unassigned') {
        const cleanEmail = cleanOwnName.includes('@')
          ? cleanOwnName.toLowerCase()
          : `${cleanOwnName.toLowerCase().replace(/[^a-z0-9]/g, '')}@rentlock.com`;
        const passwordHash = await hashPassword('demo123');
        ownerUser = await prisma.user.upsert({
          where: { email: cleanEmail },
          update: { role: 'owner', name: cleanOwnName },
          create: {
            name: cleanOwnName,
            email: cleanEmail,
            role: 'owner',
            passwordHash,
          },
          select: { id: true },
        }).catch(() => null);
      }

      if (ownerUser) resolvedOwnerId = ownerUser.id;
    }

    if (!resolvedOwnerId && data.ownerId && !isNaN(Number(data.ownerId)) && Number(data.ownerId) < 1000000000000) {
      const checkUser = await prisma.user.findFirst({
        where: { id: Number(data.ownerId), role: 'owner' },
        select: { id: true },
      });
      if (checkUser) resolvedOwnerId = checkUser.id;
    }

    const currentProp = await prisma.property.findUnique({ where: { id } });
    let existingNotes = currentProp?.accessNotes || '';
    if (data.code) existingNotes = existingNotes.replace(/\[CODE:.*?\]/g, '') + ` [CODE:${data.code}]`;
    if (data.category) existingNotes = existingNotes.replace(/\[CATEGORY:.*?\]/g, '') + ` [CATEGORY:${data.category}]`;
    if (data.portfolioGroup) existingNotes = existingNotes.replace(/\[PORTFOLIO:.*?\]/g, '') + ` [PORTFOLIO:${data.portfolioGroup}]`;
    if (data.manager) existingNotes = existingNotes.replace(/\[MGR:.*?\]/g, '') + ` [MGR:${data.manager}]`;
    if (data.owner) {
      const cleanOwnerTag = String(data.owner).replace(/\(.*?\)/g, '').trim();
      existingNotes = existingNotes.replace(/\[OWNER:.*?\]/g, '') + ` [OWNER:${cleanOwnerTag}]`;
    }

    const cleanData: any = {};
    if (data.name !== undefined) cleanData.name = data.name;
    if (data.type !== undefined) cleanData.type = data.type;
    if (data.address !== undefined) cleanData.address = data.address;
    if (data.city !== undefined) cleanData.city = data.city;
    if (data.state !== undefined) cleanData.state = data.state;
    if (data.zipCode !== undefined || data.zip !== undefined) cleanData.zipCode = data.zipCode || data.zip;
    if (data.yearBuilt !== undefined) cleanData.yearBuilt = data.yearBuilt ? Number(data.yearBuilt) : null;
    if (data.imageUrl !== undefined) cleanData.imageUrl = data.imageUrl;
    if (data.amenities !== undefined) cleanData.amenities = data.amenities;
    cleanData.accessNotes = existingNotes.trim() || undefined;
    if (resolvedManagerId !== undefined) cleanData.managerId = resolvedManagerId;
    if (resolvedOwnerId !== undefined) cleanData.ownerId = resolvedOwnerId;

    return prisma.property.update({
      where: { id },
      data: cleanData,
    });
  }

  static async deleteProperty(id: number) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new Error('Property not found');

    const units = await prisma.unit.findMany({
      where: { propertyId: id },
      select: { id: true },
    });
    const unitIds = units.map((u) => u.id);

    return prisma.$transaction(async (tx) => {
      // 1. Delete unit children
      if (unitIds.length > 0) {
        await tx.receipt.deleteMany({ where: { invoice: { unitId: { in: unitIds } } } });
        await tx.invoice.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.maintenanceTicket.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.lease.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.unit.deleteMany({ where: { id: { in: unitIds } } });
      }

      // 2. Delete property children
      await tx.receipt.deleteMany({ where: { invoice: { tenant: { propertyId: id } } } });
      await tx.invoice.deleteMany({ where: { tenant: { propertyId: id } } });
      await tx.securityDeposit.deleteMany({ where: { propertyId: id } });
      await tx.ledgerAdjustment.deleteMany({ where: { propertyId: id } });
      await tx.maintenanceTicket.deleteMany({ where: { propertyId: id } });
      await tx.preventiveSchedule.deleteMany({ where: { propertyId: id } });
      await tx.lease.deleteMany({ where: { propertyId: id } });
      await tx.visitorPass.deleteMany({ where: { propertyId: id } });
      await tx.parkingStall.deleteMany({ where: { propertyId: id } });
      await tx.expense.deleteMany({ where: { propertyId: id } });
      await tx.staff.deleteMany({ where: { propertyId: id } });
      await tx.broadcast.deleteMany({ where: { propertyId: id } });
      await tx.tenant.deleteMany({ where: { propertyId: id } });
      await tx.propertyDocument.deleteMany({ where: { propertyId: id } });

      // 3. Delete property record
      return tx.property.delete({ where: { id } });
    });
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

  // -------------------- PORTFOLIO GROUPS --------------------
  private static customPortfolios: Set<string> = new Set([
    'Brooklyn & Queens',
    'New Jersey',
    'Texas Commercial & Resi',
    'Core East Coast',
  ]);

  static async listPortfolios() {
    try {
      const properties = await prisma.property.findMany({ select: { accessNotes: true } });
      properties.forEach((p) => {
        const match = p.accessNotes?.match(/\[PORTFOLIO:(.*?)\]/)?.[1];
        if (match && match.trim()) {
          PropertyService.customPortfolios.add(match.trim());
        }
      });
    } catch {}
    return Array.from(PropertyService.customPortfolios);
  }

  static async createPortfolio(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Portfolio group name is required');
    PropertyService.customPortfolios.add(trimmed);
    return { name: trimmed, portfolios: Array.from(PropertyService.customPortfolios) };
  }

  static async deletePortfolio(name: string) {
    const target = decodeURIComponent(name).trim().toLowerCase();
    for (const p of PropertyService.customPortfolios) {
      if (p.toLowerCase() === target) {
        PropertyService.customPortfolios.delete(p);
        break;
      }
    }
    return { success: true, portfolios: Array.from(PropertyService.customPortfolios) };
  }
}
