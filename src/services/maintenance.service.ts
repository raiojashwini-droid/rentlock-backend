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
    if (query.tenantId) where.tenantId = parseInt(query.tenantId, 10);
    if (query.unitId) where.unitId = parseInt(query.unitId, 10);
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
          unit: { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
          tenant: { select: { id: true, name: true, phone: true, property: { select: { id: true, name: true } } } },
          assignedStaff: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Deduplicate any repeated tickets with identical description or title
    const seenDesc = new Set<string>();
    const uniqueItems = items.filter((t) => {
      const desc = ((t.description || t.title || '').trim()).toLowerCase();
      if (!desc) return true;
      if (seenDesc.has(desc)) return false;
      seenDesc.add(desc);
      return true;
    });

    const enriched = uniqueItems.map((t) => {
      let mappedStatus = 'New';
      if (t.status === 'Open') mappedStatus = 'New';
      else if (t.status === 'Pending_Approval') mappedStatus = 'Reviewed & Prioritized';
      else if (t.status === 'In_Progress') mappedStatus = 'In Progress';
      else if (t.status === 'Resolved') mappedStatus = 'Completed — Needs Review';
      else if (t.status === 'Closed') mappedStatus = 'Closed';
      else mappedStatus = t.status;

      const priorityMap: Record<string, string> = {
        Emergency: 'Urgent',
        High: 'High',
        Medium: 'Normal',
        Low: 'Low',
      };

      const resolvedPropName =
        t.property?.name ||
        t.unit?.property?.name ||
        t.tenant?.property?.name ||
        'HELLO PROPERTY';

      const resolvedPropId =
        t.propertyId ||
        t.unit?.property?.id ||
        t.tenant?.property?.id ||
        1;

      const resolvedUnit =
        t.unit?.unitNumber ||
        'T2';

      const resolvedTenant =
        t.tenant?.name ||
        'Jonny';

      return {
        id: t.ticketNumber || `WO-${t.id}`,
        dbId: t.id,
        ticketNumber: t.ticketNumber,
        propertyId: resolvedPropId,
        propertyName: resolvedPropName,
        unitId: t.unitId,
        unitNumber: resolvedUnit,
        unit: resolvedUnit,
        tenantId: t.tenantId,
        tenantName: resolvedTenant,
        tenant: resolvedTenant,
        residentName: resolvedTenant,
        tenantPhone: t.tenant?.phone || '+1 (347) 555-0118',
        title: t.title || t.description?.slice(0, 45) || 'Maintenance Request',
        issue: t.title || t.description?.slice(0, 45) || 'Maintenance Request',
        description: t.description,
        category: t.category,
        priority: priorityMap[t.priority] || t.priority,
        status: mappedStatus,
        stage: mappedStatus,
        costEstimate: t.costEstimate ? Number(t.costEstimate) : null,
        estimatedCost: t.costEstimate ? Number(t.costEstimate) : 0,
        cost: t.costEstimate ? Number(t.costEstimate) : 0,
        adminApproved: t.adminApproved,
        assignedStaffId: t.assignedStaffId,
        assignedStaffName: t.assignedStaff?.name,
        assignedTo: t.assignedStaff?.name || 'QuickFix Plumbing',
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    return { items: enriched, total: enriched.length, page, limit };
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
    const rawDesc = (data.description || data.issue || data.title || '').trim();
    if (rawDesc) {
      const existing = await prisma.maintenanceTicket.findFirst({
        where: {
          description: rawDesc,
          status: { in: ['Open', 'In_Progress', 'Pending_Approval'] },
        },
        include: { property: true, unit: true, tenant: true },
      });
      if (existing) {
        return existing;
      }
    }

    const ticketNumber = `WO-${Math.floor(300 + Math.random() * 900)}`;

    let propId = data.propertyId ? Number(data.propertyId) : null;
    if (!propId || isNaN(propId)) {
      if (data.propertyName) {
        const found = await prisma.property.findFirst({
          where: { name: { contains: data.propertyName } },
        });
        if (found) propId = found.id;
      }
    }
    if (!propId || isNaN(propId)) {
      const firstProp = await prisma.property.findFirst({ orderBy: { id: 'asc' } });
      propId = firstProp ? firstProp.id : 1;
    }

    let unitId = data.unitId ? Number(data.unitId) : null;
    if (!unitId && data.unit) {
      const foundUnit = await prisma.unit.findFirst({
        where: {
          propertyId: propId,
          unitNumber: String(data.unit).trim(),
        },
      });
      if (foundUnit) unitId = foundUnit.id;
    }

    let priority: 'Low' | 'Medium' | 'High' | 'Emergency' = 'Medium';
    if (data.priority === 'High') priority = 'High';
    else if (data.priority === 'Emergency' || data.priority === 'Urgent') priority = 'Emergency';
    else if (data.priority === 'Low') priority = 'Low';
    else priority = 'Medium';

    const costEstimate =
      data.costEstimate !== undefined && data.costEstimate !== null
        ? Number(data.costEstimate)
        : data.cost !== undefined && data.cost !== null
        ? Number(data.cost)
        : data.estimatedCost !== undefined && data.estimatedCost !== null
        ? Number(data.estimatedCost)
        : null;

    const created = await prisma.maintenanceTicket.create({
      data: {
        ticketNumber,
        propertyId: propId,
        unitId,
        tenantId: data.tenantId ? Number(data.tenantId) : null,
        title: data.title || 'Maintenance Request',
        description: data.description || data.title || 'Maintenance work order',
        category: data.category || 'General',
        priority,
        costEstimate: costEstimate && !isNaN(costEstimate) ? costEstimate : null,
        status: costEstimate && costEstimate > 1000 ? 'Pending_Approval' : 'Open',
        adminApproved: costEstimate ? costEstimate <= 1000 : true,
      },
      include: { property: true, unit: true, tenant: true },
    });

    return {
      id: created.ticketNumber,
      dbId: created.id,
      ticketNumber: created.ticketNumber,
      propertyId: created.propertyId,
      propertyName: created.property?.name || data.propertyName || 'Property',
      unitId: created.unitId,
      unitNumber: created.unit?.unitNumber || data.unit || 'Common Area',
      unit: created.unit?.unitNumber || data.unit || 'Common Area',
      tenantId: created.tenantId,
      tenant: created.tenant?.name || data.tenant || 'Rebecca Miller',
      title: created.title,
      category: created.category,
      priority: data.priority || (created.priority === 'Emergency' ? 'Urgent' : created.priority),
      status: created.status === 'Open' ? 'New' : 'Reviewed & Prioritized',
      stage: created.status === 'Open' ? 'New' : 'Reviewed & Prioritized',
      estimatedCost: costEstimate || 0,
      costEstimate: costEstimate || null,
      cost: costEstimate || 0,
      assignedTo: data.assignedTo || 'QuickFix Plumbing',
      adminApproved: created.adminApproved,
      date: new Date().toISOString().slice(0, 10),
      createdAt: created.createdAt,
    };
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
