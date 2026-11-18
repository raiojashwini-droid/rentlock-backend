import { prisma } from '../config/database.js';

export class PortalService {
  // -------------------- OWNER PORTAL --------------------
  static async getOwnerOverview(ownerId: number) {
    let properties = await prisma.property.findMany({
      where: { ownerId },
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
          .reduce((sum, u) => sum + Number(u.rentAmount), 0),
      0
    );

    const totalExpenses = properties.reduce(
      (s, p) => s + p.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      0
    );

    const netOperatingIncome = totalRevenue - totalExpenses;

    return {
      portfolioName: 'Claire Bennett Holdings',
      totalProperties: properties.length,
      totalUnits,
      occupiedUnits,
      occupancyRate,
      monthlyGrossRevenue: totalRevenue,
      monthlyOperatingExpenses: totalExpenses,
      netOperatingIncome,
      cashHeldInReserve: 0.0,
      properties: properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        unitsCount: p.units.length,
      })),
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
  static async getTenantBalance(tenantUserId: number) {
    let tenant = await prisma.tenant.findUnique({
      where: { userId: tenantUserId },
      include: {
        property: true,
        unit: true,
        leases: { where: { status: 'Active' }, take: 1 },
        invoices: { where: { status: 'Pending' }, orderBy: { dueDate: 'asc' } },
        securityDeposits: { take: 1 },
      },
    });

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        include: {
          property: true,
          unit: true,
          leases: { where: { status: 'Active' }, take: 1 },
          invoices: { where: { status: 'Pending' }, orderBy: { dueDate: 'asc' } },
          securityDeposits: { take: 1 },
        },
      });
    }

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

    const totalBalanceDue = tenant.invoices.reduce((s, i) => s + Number(i.balance), 0);
    const activeLease = tenant.leases[0];
    const securityDeposit = tenant.securityDeposits[0];

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        unitNumber: tenant.unit?.unitNumber || 'A-204',
        propertyName: tenant.property.name,
      },
      currentBalanceDue: totalBalanceDue,
      nextDueDate: tenant.invoices[0]?.dueDate || null,
      monthlyRent: activeLease ? Number(activeLease.monthlyRent) : Number(tenant.unit?.rentAmount || 0),
      securityDepositHeld: securityDeposit ? Number(securityDeposit.totalHeld) : 1950,
      openInvoices: tenant.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        description: inv.description,
        amount: Number(inv.amount),
        balance: Number(inv.balance),
        dueDate: inv.dueDate,
      })),
    };
  }

  static async submitTenantPayment(data: any, tenantUserId: number) {
    const tenant = await prisma.tenant.findUnique({ where: { userId: tenantUserId } });
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

    const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw new Error('Invoice not found');

    const payAmt = Math.min(Number(invoice.balance), data.amount);
    const newPaid = Number(invoice.paidAmount) + payAmt;
    const newBal = Math.max(0, Number(invoice.amount) - newPaid);
    const newStatus = newBal === 0 ? 'Paid' : 'Pending';

    const receiptNumber = `RCT-${Math.floor(8000 + Math.random() * 1000)}`;

    const [updatedInvoice, receipt] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id: data.invoiceId },
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
          invoiceId: data.invoiceId,
          amount: payAmt,
          method: data.paymentMethod,
          status: 'Posted',
          auditNotes: `Online payment submitted by tenant ${tenant.name}`,
        },
      }),
    ]);

    return { invoice: updatedInvoice, receipt };
  }

  static async submitTenantWorkOrder(data: any, tenantUserId: number) {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: tenantUserId },
      include: { property: true, unit: true },
    });

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

    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    return prisma.maintenanceTicket.create({
      data: {
        ticketNumber,
        propertyId: tenant.propertyId,
        unitId: tenant.unitId,
        tenantId: tenant.id,
        title: `${data.category}: ${data.description.slice(0, 30)}...`,
        description: `${data.description}\nLocation: ${data.issueLocation}\nPreferred Access: ${data.accessTime}`,
        category: data.category,
        priority: 'Medium',
        status: 'Open',
      },
      include: { property: true, unit: true },
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
    return prisma.property.update({
      where: { id: propertyId },
      data: { accessNotes },
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
