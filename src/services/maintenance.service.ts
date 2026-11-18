import { prisma } from '../config/database.js';
import { AuthUserPayload } from '../types/index.js';
import { env } from '../config/env.js';

export class MaintenanceService {
  static async listTickets(query: any, user?: AuthUserPayload) {
    const where: any = {};

    if (user?.role === 'manager') {
      where.property = { managerId: user.id };
    } else if (user?.role === 'tenant') {
      where.tenant = { userId: user.id };
    }

    if (query.propertyId) where.propertyId = parseInt(query.propertyId, 10);
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.maintenanceTicket.count({ where }),
      prisma.maintenanceTicket.findMany({
        where,
        skip,
        take: limit,
        include: {
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, unitNumber: true } },
          tenant: { select: { id: true, name: true, phone: true } },
          assignedStaff: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const enriched = items.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      propertyId: t.propertyId,
      propertyName: t.property.name,
      unitId: t.unitId,
      unitNumber: t.unit?.unitNumber || 'Common Area',
      tenantId: t.tenantId,
      tenantName: t.tenant?.name || 'On-Site Staff',
      tenantPhone: t.tenant?.phone,
      title: t.title,
      issue: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      stage: t.status,
      costEstimate: t.costEstimate ? Number(t.costEstimate) : null,
      cost: t.costEstimate ? Number(t.costEstimate) : 0,
      adminApproved: t.adminApproved,
      assignedStaffId: t.assignedStaffId,
      assignedStaffName: t.assignedStaff?.name,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return { items: enriched, total, page, limit };
  }

  static async getTicketById(id: number) {
    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: {
        property: true,
        unit: true,
        tenant: true,
        assignedStaff: true,
      },
    });

    if (!ticket) throw new Error('Ticket not found');
    return ticket;
  }

  static async createTicket(data: any) {
    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    return prisma.maintenanceTicket.create({
      data: {
        ticketNumber,
        propertyId: data.propertyId,
        unitId: data.unitId,
        tenantId: data.tenantId,
        title: data.title,
        description: data.description,
        category: data.category || 'General',
        priority: data.priority || 'Medium',
        status: 'Open',
      },
      include: { property: true, unit: true, tenant: true },
    });
  }

  static async triageTicket(id: number, data: any, user?: AuthUserPayload) {
    const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new Error('Ticket not found');

    let nextStatus = data.status || ticket.status;
    const costEstimate = data.costEstimate !== undefined ? data.costEstimate : ticket.costEstimate;

    // Spending Cap Enforcement:
    // If estimated cost exceeds manager spending approval cap and user is Manager, escalate to Pending_Approval
    if (
      user?.role === 'manager' &&
      costEstimate &&
      Number(costEstimate) > env.MANAGER_SPENDING_APPROVAL_CAP &&
      !ticket.adminApproved
    ) {
      nextStatus = 'Pending_Approval';
    }

    return prisma.maintenanceTicket.update({
      where: { id },
      data: {
        status: nextStatus,
        costEstimate: costEstimate !== undefined ? costEstimate : undefined,
        assignedStaffId: data.assignedStaffId !== undefined ? data.assignedStaffId : undefined,
      },
      include: { property: true, unit: true, tenant: true, assignedStaff: true },
    });
  }

  static async approveSpending(id: number, adminUser: AuthUserPayload) {
    const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new Error('Ticket not found');

    const updated = await prisma.maintenanceTicket.update({
      where: { id },
      data: {
        adminApproved: true,
        status: 'In_Progress',
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        auditId: `AUD-${Date.now()}`,
        userId: adminUser.id,
        userLabel: `${adminUser.name} (Admin)`,
        action: 'Approved Maintenance Work Order Over-Cap Spending',
        target: `${ticket.ticketNumber} ($${ticket.costEstimate})`,
        reason: 'Authorized spending exceeding manager approval threshold',
      },
    });

    return updated;
  }

  static async listPreventiveSchedules(query: any) {
    const where: any = {};
    if (query.propertyId) where.propertyId = parseInt(query.propertyId, 10);

    const items = await prisma.preventiveSchedule.findMany({
      where,
      include: { property: { select: { id: true, name: true } } },
      orderBy: { nextDue: 'asc' },
    });

    return items.map((p) => ({
      id: p.id,
      scheduleNumber: p.scheduleNumber,
      propertyId: p.propertyId,
      propertyName: p.property.name,
      title: p.title,
      category: p.category,
      vendor: p.vendor,
      frequency: p.frequency,
      nextDue: p.nextDue,
      costCap: Number(p.costCap),
      status: p.status,
    }));
  }

  static async createPreventiveSchedule(data: any) {
    const scheduleNumber = `PM-0${Math.floor(10 + Math.random() * 90)}`;

    return prisma.preventiveSchedule.create({
      data: {
        scheduleNumber,
        propertyId: data.propertyId,
        title: data.title,
        category: data.category || 'General',
        vendor: data.vendor,
        frequency: data.frequency,
        nextDue: new Date(data.nextDue),
        costCap: data.costCap || 500,
        status: 'Scheduled',
      },
      include: { property: true },
    });
  }

  static async updatePreventiveSchedule(id: number, data: any) {
    return prisma.preventiveSchedule.update({
      where: { id },
      data: {
        ...data,
        nextDue: data.nextDue ? new Date(data.nextDue) : undefined,
      },
    });
  }

  static async deletePreventiveSchedule(id: number) {
    return prisma.preventiveSchedule.delete({ where: { id } });
  }
}
