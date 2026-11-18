import { prisma } from '../config/database.js';

export class SearchService {
  static async searchAll(query: string) {
    if (!query || query.trim().length < 2) {
      return { properties: [], units: [], tenants: [], invoices: [], tickets: [] };
    }

    const q = query.trim();

    const [properties, units, tenants, invoices, tickets] = await Promise.all([
      prisma.property.findMany({
        where: {
          OR: [{ name: { contains: q } }, { address: { contains: q } }, { city: { contains: q } }],
        },
        take: 5,
        select: { id: true, name: true, address: true, city: true },
      }),
      prisma.unit.findMany({
        where: {
          OR: [{ unitNumber: { contains: q } }, { property: { name: { contains: q } } }],
        },
        take: 5,
        select: {
          id: true,
          unitNumber: true,
          status: true,
          property: { select: { id: true, name: true } },
        },
      }),
      prisma.tenant.findMany({
        where: {
          OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }],
        },
        take: 5,
        select: { id: true, name: true, email: true, phone: true },
      }),
      prisma.invoice.findMany({
        where: {
          OR: [{ invoiceNumber: { contains: q } }, { description: { contains: q } }],
        },
        take: 5,
        select: { id: true, invoiceNumber: true, description: true, amount: true, status: true },
      }),
      prisma.maintenanceTicket.findMany({
        where: {
          OR: [{ ticketNumber: { contains: q } }, { title: { contains: q } }],
        },
        take: 5,
        select: { id: true, ticketNumber: true, title: true, priority: true, status: true },
      }),
    ]);

    return { properties, units, tenants, invoices, tickets };
  }
}
