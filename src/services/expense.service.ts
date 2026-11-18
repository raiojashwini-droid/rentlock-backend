import { prisma } from '../config/database.js';
import { AuthUserPayload } from '../types/index.js';

export class ExpenseService {
  static async listExpenses(query: any, user?: AuthUserPayload) {
    const where: any = {};

    if (user?.role === 'manager') {
      where.property = { managerId: user.id };
    } else if (user?.role === 'owner') {
      where.property = { ownerId: user.id };
    }

    if (query.propertyId) where.propertyId = parseInt(query.propertyId, 10);
    if (query.category) where.category = query.category;
    if (query.isPaid !== undefined) where.isPaid = query.isPaid === 'true';

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        include: {
          property: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const enriched = items.map((e) => ({
      id: e.id,
      propertyId: e.propertyId,
      propertyName: e.property.name,
      vendorId: e.vendorId,
      vendorName: e.vendor?.name || 'In-House Staff',
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      date: e.date,
      isPaid: e.isPaid,
      paymentState: e.isPaid ? 'Paid' : 'Pending Approval',
      status: e.isPaid ? 'Paid' : 'Pending',
      paidAt: e.paidAt,
      createdAt: e.createdAt,
    }));

    return { items: enriched, total, page, limit };
  }

  static async createExpense(data: any) {
    return prisma.expense.create({
      data: {
        propertyId: data.propertyId,
        vendorId: data.vendorId,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        isPaid: data.isPaid || false,
      },
      include: { property: true, vendor: true },
    });
  }

  static async updateExpense(id: number, data: any) {
    return prisma.expense.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { property: true, vendor: true },
    });
  }

  static async deleteExpense(id: number) {
    return prisma.expense.delete({ where: { id } });
  }
}
