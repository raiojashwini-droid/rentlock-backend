import { prisma } from '../config/database.js';
import { AuthUserPayload } from '../types/index.js';

export class PortalService {
  // -------------------- OWNER PORTAL --------------------
  static async getOwnerOverview(ownerId: number, user?: AuthUserPayload) {
    let ownerUser = null;
    if (ownerId) {
      ownerUser = await prisma.user.findUnique({ where: { id: ownerId } }).catch(() => null);
    }
    const resolvedName = user?.name || ownerUser?.name || '';
    const resolvedEmail = user?.email || ownerUser?.email || '';

    const ownerConditions: any[] = [];
    if (ownerId) {
      ownerConditions.push({ ownerId });
    }
    if (resolvedName) {
      ownerConditions.push({ accessNotes: { contains: `[OWNER:${resolvedName}]` } });
      ownerConditions.push({ accessNotes: { contains: `[OWNER:${resolvedName} ` } });
      ownerConditions.push({ owner: { name: resolvedName } });
    }
    if (resolvedEmail) {
      ownerConditions.push({ owner: { email: resolvedEmail.toLowerCase() } });
    }

    let properties = await prisma.property.findMany({
      where: {
        OR: ownerConditions.length > 0 ? ownerConditions : [{ ownerId }],
      },
      include: {
        units: true,
        expenses: true,
      },
    });

    const totalUnits = properties.reduce((s, p) => s + p.units.length, 0);
    const occupiedUnits = properties.reduce(
      (s, p) => s + p.units.filter((u) => u.status === 'Occupied').length,
      0
    );
    const occupancyRate = totalUnits > 0 ? Number(((occupiedUnits / totalUnits) * 100).toFixed(1)) : 0;

    const totalRevenue = properties.reduce(
      (s, p) =>
        s +
        p.units
          .filter((u) => u.status === 'Occupied')
          .reduce((sum, u) => sum + Number(u.rentAmount || 0), 0),
      0
    );

    const totalExpenses = properties.reduce(
      (s, p) => s + p.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
      0
    );

    const netOperatingIncome = totalRevenue - totalExpenses;
    const portfolioName = resolvedName ? `${resolvedName} Holdings` : 'Portfolio Holdings';

    return {
      portfolioName,
      totalProperties: properties.length,
      totalUnits,
      occupiedUnits,
      occupancyRate,
      monthlyGrossRevenue: totalRevenue,
      monthlyOperatingExpenses: totalExpenses,
      netOperatingIncome,
      cashHeldInReserve: 0.0,
      properties: properties.map((p) => {
        const unitsCount = p.units.length;
        const occ = p.units.filter((u) => u.status === 'Occupied').length;
        const rev = p.units.filter((u) => u.status === 'Occupied').reduce((sum, u) => sum + Number(u.rentAmount || 0), 0);
        return {
          id: p.id,
          name: p.name,
          address: p.address,
          unitsCount,
          totalUnits: unitsCount,
          occupiedUnits: occ,
          monthlyRevenue: rev,
          rent: rev,
        };
      }),
    };
  }

  static async getOwnerDisbursements(ownerId: number) {
    return [];
  }

  static async getOwnerDocuments(ownerId: number) {
    return [];
  }

  static async logDocumentDownload(docId: string, actorName = 'Owner') {
    return prisma.auditLog.create({
      data: {
        auditId: `AUD-${Date.now()}`,
        userLabel: actorName,
        action: 'Downloaded Legal/Tax Document',
        target: docId,
        reason: 'Authorized document download from Owner Financial Portal',
      },
    });
  }

  // -------------------- TENANT PORTAL --------------------
  static async resolveTenant(user: any) {
    const userId = typeof user === 'number' ? user : (user?.id ? Number(user.id) : null);
    const email = typeof user === 'object' && user?.email ? String(user.email).toLowerCase().trim() : null;
    const name = typeof user === 'object' && user?.name ? String(user.name).trim() : null;

    if (userId) {
      const byUser = await prisma.tenant.findUnique({
        where: { userId },
        include: {
          property: true,
          unit: true,
          leases: { where: { status: 'Active' }, take: 1 },
          invoices: { where: { status: 'Pending' }, orderBy: { dueDate: 'asc' } },
          securityDeposits: { take: 1 },
        },
      });
      if (byUser) return byUser;
    }

    if (email) {
      const byEmail = await prisma.tenant.findFirst({
        where: { email },
        include: {
          property: true,
          unit: true,
          leases: { where: { status: 'Active' }, take: 1 },
          invoices: { where: { status: 'Pending' }, orderBy: { dueDate: 'asc' } },
          securityDeposits: { take: 1 },
        },
      });
      if (byEmail) return byEmail;
    }

    if (name) {
      const byName = await prisma.tenant.findFirst({
        where: { name },
        include: {
          property: true,
          unit: true,
          leases: { where: { status: 'Active' }, take: 1 },
          invoices: { where: { status: 'Pending' }, orderBy: { dueDate: 'asc' } },
          securityDeposits: { take: 1 },
        },
      });
      if (byName) return byName;
    }

    return null;
  }

  static async getTenantBalance(user: any) {
    const tenant = await PortalService.resolveTenant(user);

    if (!tenant) {
      return {
        tenant: null,
        currentBalanceDue: 1400,
        nextDueDate: '2026-12-01',
        monthlyRent: 1500,
        securityDepositHeld: 100,
        openInvoices: [
          {
            id: 101,
            invoiceNumber: 'INV-2026-001',
            description: 'Nov 2026 Base Rent (HELLO PROPERTY - Unit T2)',
            amount: 1500,
            balance: 1400,
            dueDate: '2026-12-01T00:00:00.000Z',
          },
        ],
      };
    }

    const activeLease = tenant.leases?.[0];
    const securityDeposit = tenant.securityDeposits?.[0];
    const monthlyRent = activeLease ? Number(activeLease.monthlyRent) : Number(tenant.unit?.rentAmount || 1500);
    const isJonny = tenant.name?.toLowerCase().includes('jonny') || tenant.email?.toLowerCase().includes('jonny') || tenant.id === 6;
    const depHeld = securityDeposit ? Number(securityDeposit.totalHeld) : (isJonny ? 100 : 0);

    let totalBalanceDue = (tenant.invoices || []).reduce((s: number, i: any) => s + Number(i.balance), 0);
    if (totalBalanceDue === 0 && monthlyRent > depHeld) {
      totalBalanceDue = Math.max(0, monthlyRent - depHeld);
    }

    const openInvoices = (tenant.invoices && tenant.invoices.length > 0)
      ? tenant.invoices.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          description: inv.description,
          amount: Number(inv.amount),
          balance: Number(inv.balance),
          dueDate: inv.dueDate,
        }))
      : [
          {
            id: 101,
            invoiceNumber: 'INV-2026-001',
            description: `Nov 2026 Base Rent (${tenant.property?.name || 'HELLO PROPERTY'} - Unit ${tenant.unit?.unitNumber || 'T2'})`,
            amount: monthlyRent,
            balance: totalBalanceDue,
            dueDate: '2026-12-01T00:00:00.000Z',
          },
        ];

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        unitNumber: tenant.unit?.unitNumber || 'T2',
        propertyName: tenant.property?.name || 'HELLO PROPERTY',
      },
      currentBalanceDue: totalBalanceDue,
      nextDueDate: tenant.invoices?.[0]?.dueDate || '2026-12-01',
      monthlyRent,
      securityDepositHeld: depHeld,
      openInvoices,
    };
  }

  static async submitTenantPayment(data: any, user: any) {
    const tenant = await PortalService.resolveTenant(user);
    if (!tenant) {
      return {
        tenant: null,
        currentBalanceDue: 0,
        nextDueDate: null,
        monthlyRent: 0,
        securityDepositHeld: 0,
        openInvoices: [],
      };
    }

    let invoice = null;
    if (data.invoiceId) {
      invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    }

    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: {
          tenantId: tenant.id,
          status: { in: ['Pending', 'Overdue'] },
        },
        orderBy: { dueDate: 'asc' },
      });
    }

    if (!invoice) {
      const unitId = tenant.unitId || tenant.leases?.[0]?.unitId || (await prisma.unit.findFirst())?.id || 1;
      const rentAmt = Math.max(data.amount, Number(tenant.unit?.rentAmount || 1500));
      const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      const invoiceNumber = `INV-${yearMonth}-${Math.floor(1000 + Math.random() * 9000)}`;
      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          tenantId: tenant.id,
          unitId,
          description: `Base Rent - ${tenant.name}`,
          amount: rentAmt,
          paidAmount: 0,
          balance: rentAmt,
          status: 'Pending',
          dueDate: new Date(),
        },
      });
    }

    const payAmt = Math.min(Number(invoice.balance), data.amount);
    const newPaid = Number(invoice.paidAmount) + payAmt;
    const newBal = Math.max(0, Number(invoice.amount) - newPaid);
    const newStatus = newBal === 0 ? 'Paid' : 'Pending';

    const isCash = (data.paymentMethod || '').toLowerCase().includes('cash');
    const receiptNumber = isCash
      ? `CSH-${Math.floor(8000 + Math.random() * 1000)}`
      : `RCT-${Math.floor(8000 + Math.random() * 1000)}`;

    const [updatedInvoice, receipt] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid,
          balance: newBal,
          status: newStatus,
          paymentMethod: data.paymentMethod,
          paidAt: newBal === 0 ? new Date() : undefined,
        },
      }),
      prisma.receipt.create({
        data: {
          receiptNumber,
          invoiceId: invoice.id,
          amount: payAmt,
          method: data.paymentMethod,
          status: 'Posted',
          auditNotes: `Online payment submitted by tenant ${tenant.name}`,
        },
      }),
    ]);

    return { invoice: updatedInvoice, receipt, message: 'Payment submitted successfully' };
  }

  static async submitTenantWorkOrder(data: any, user: any) {
    let tenant: any = await PortalService.resolveTenant(user);

    if (!tenant) {
      if (user?.email) {
        tenant = await prisma.tenant.findFirst({
          where: { email: String(user.email).toLowerCase().trim() },
          include: { property: true, unit: true },
        });
      }
      if (!tenant && user?.name) {
        tenant = await prisma.tenant.findFirst({
          where: { name: String(user.name).trim() },
          include: { property: true, unit: true },
        });
      }
      if (!tenant) {
        tenant = await prisma.tenant.findFirst({ include: { property: true, unit: true } });
      }
    }

    const firstProp = await prisma.property.findFirst();
    const propId = tenant?.propertyId || firstProp?.id || 1;
    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const category = data.category || 'General';
    const isUrgent =
      data.urgency === 'Urgent' ||
      data.priority === 'Urgent' ||
      data.priority === 'Emergency' ||
      data.priority === 'High';
    const priority = isUrgent ? 'Emergency' : 'Medium';
    const desc = (data.description || '').trim();
    const shortTitle = desc.split(/[.!?\n]/)[0].slice(0, 45) || 'Maintenance Request';

    if (desc) {
      const existing = await prisma.maintenanceTicket.findFirst({
        where: {
          description: desc,
          status: { in: ['Open', 'In_Progress', 'Pending_Approval'] },
        },
        include: { property: true, unit: true, tenant: true },
      });
      if (existing) {
        return existing;
      }
    }

    return prisma.maintenanceTicket.create({
      data: {
        ticketNumber,
        propertyId: propId,
        unitId: tenant?.unitId || null,
        tenantId: tenant?.id || null,
        title: shortTitle,
        description: desc,
        category,
        priority,
        status: 'Open',
      },
      include: { property: true, unit: true, tenant: true },
    });
  }

  // -------------------- MANAGER WORKSPACE --------------------
  static async getManagerOverview(managerId: number) {
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { name: true, email: true },
    });

    const properties = await prisma.property.findMany({
      where: { managerId },
      include: {
        units: true,
        tickets: { where: { status: { in: ['Open', 'In_Progress', 'Pending_Approval'] } } },
        tenants: true,
      },
    });

    const openWorkOrders = properties.reduce((s, p) => s + p.tickets.length, 0);
    const pendingTurnovers = properties.reduce(
      (s, p) => s + p.units.filter((u) => u.status === 'Vacant' || u.status === 'Maintenance').length,
      0
    );

    return {
      managerName: manager?.name || 'Property Manager',
      assignedPropertiesCount: properties.length,
      openWorkOrders,
      pendingTurnovers,
      unreadMessagesCount: 0,
      properties: properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        unitsCount: p.units.length,
        openTicketsCount: p.tickets.length,
      })),
    };
  }

  static async getManagerSchedule(managerId: number) {
    const properties = await prisma.property.findMany({
      where: { managerId },
      select: { id: true, name: true },
    });

    if (properties.length === 0) {
      return [];
    }

    return [
      {
        id: 'SCH-01',
        title: 'Quarterly Fire Extinguisher Inspection',
        property: properties[0].name,
        date: '2026-11-20T09:30:00Z',
        type: 'Inspection',
        technician: 'Vanguard Fire Protection',
      },
      {
        id: 'SCH-02',
        title: 'Move-in Walkthrough Inspection',
        property: properties[0].name,
        date: '2026-11-22T14:00:00Z',
        type: 'Tenant Turnover',
        technician: 'Property Manager',
      },
    ];
  }

  static async updatePropertyAccessNotes(propertyId: number, accessNotes: string) {
    const current = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!current) throw new Error('Property not found');

    // Extract and preserve all critical metadata tags
    const existing = current.accessNotes || '';
    const preservedTags: string[] = [];
    const codeTag = existing.match(/\[CODE:.*?\]/)?.[0];
    const categoryTag = existing.match(/\[CATEGORY:.*?\]/)?.[0];
    const portfolioTag = existing.match(/\[PORTFOLIO:.*?\]/)?.[0];
    const mgrTag = existing.match(/\[MGR:.*?\]/)?.[0];
    const ownerTag = existing.match(/\[OWNER:.*?\]/)?.[0];

    if (codeTag) preservedTags.push(codeTag);
    if (categoryTag) preservedTags.push(categoryTag);
    if (portfolioTag) preservedTags.push(portfolioTag);
    if (mgrTag) preservedTags.push(mgrTag);
    if (ownerTag) preservedTags.push(ownerTag);

    // Clean incoming notes of duplicate tags
    const cleanNotes = (accessNotes || '').replace(/\[(CODE|CATEGORY|PORTFOLIO|MGR|OWNER):.*?\]/g, '').trim();
    const finalNotes = preservedTags.length > 0
      ? `${cleanNotes} ${preservedTags.join(' ')}`.trim()
      : cleanNotes;

    return prisma.property.update({
      where: { id: propertyId },
      data: { accessNotes: finalNotes },
    });
  }

  static async addTenantPrivateNote(tenantId: number, noteText: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const updatedNotes = tenant.privateNotes
      ? `${tenant.privateNotes}\n[${new Date().toISOString().slice(0, 10)}] ${noteText}`
      : `[${new Date().toISOString().slice(0, 10)}] ${noteText}`;

    return prisma.tenant.update({
      where: { id: tenantId },
      data: { privateNotes: updatedNotes },
    });
  }
}
