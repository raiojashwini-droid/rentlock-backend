import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import { sendSuccess } from '../utils/response.js';

export class UserController {
  static async listOwners(_req: Request, res: Response, next: NextFunction) {
    try {
      const owners = await prisma.user.findMany({
        where: { role: 'owner' },
        include: {
          ownedProperties: { select: { id: true, name: true, city: true } },
        },
      });

      const enriched = owners.map((o) => {
        const propNames = (o.ownedProperties || []).map((p) => p.name);
        return {
          id: o.id,
          name: o.name,
          email: o.email,
          phone: o.phone || '+1 (212) 555-0188',
          role: o.role,
          ownerType: 'LLC',
          entityName: `${o.name} Real Estate Investments LLC`,
          mailingAddress: '550 Madison Ave, New York, NY 10022',
          distributionMethod: 'Direct Deposit (ACH)',
          bankAccountMasked: 'Chase (****4821)',
          properties: propNames,
          ownedProperties: o.ownedProperties,
          totalUnits: (o.ownedProperties || []).length,
          sharePercentage: 100,
          distributionsYtd: 0,
          netIncome: 0,
          status: 'Active',
          archived: false,
          hasLogin: true,
          password: '••••••••',
          createdAt: o.createdAt,
        };
      });

      return sendSuccess(res, enriched);
    } catch (error) {
      return next(error);
    }
  }

  static async createOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, password } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();
      const passwordHash = await hashPassword(password || 'demo123');

      const user = await prisma.user.upsert({
        where: { email: cleanEmail },
        update: {
          name: name || undefined,
          phone: phone || undefined,
          passwordHash,
          role: 'owner',
        },
        create: {
          name,
          email: cleanEmail,
          phone,
          passwordHash,
          role: 'owner',
        },
      });

      return sendSuccess(res, user, 'Owner created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async listManagers(_req: Request, res: Response, next: NextFunction) {
    try {
      const managers = await prisma.user.findMany({
        where: { role: 'manager' },
        include: {
          managedProperties: { select: { id: true, name: true, city: true } },
          permissions: true,
        },
      });

      const enriched = managers.map((m) => {
        const propNames = (m.managedProperties || []).map((p) => p.name);
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone || '+1 (718) 555-0192',
          role: m.role,
          title: 'Senior Property Manager',
          spendingCap: 1000,
          spendingLimit: 1000,
          properties: propNames,
          managedProperties: m.managedProperties,
          permissions: m.permissions,
          employmentType: 'Full-Time',
          shift: 'Day (8 AM–5 PM)',
          status: 'Active',
          activeWorkOrders: 0,
          attendance: 100,
          rating: 5.0,
          archived: false,
          createdAt: m.createdAt,
        };
      });

      return sendSuccess(res, enriched);
    } catch (error) {
      return next(error);
    }
  }

  static async syncManagerProperties(managerId: number, propList: any[]) {
    try {
      const normalized = (propList || [])
        .map((p) => {
          if (typeof p === 'object' && p !== null) return String(p.name || p.id || '').trim();
          return String(p || '').trim();
        })
        .filter(Boolean);

      const matchingProps = await prisma.property.findMany({
        where: {
          OR: [
            { name: { in: normalized } },
            { id: { in: normalized.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n)) } },
          ],
        },
        select: { id: true, name: true },
      });

      const matchingIds = matchingProps.map((p) => p.id);

      // Remove this manager from any properties that are not in the new list
      await prisma.property.updateMany({
        where: {
          managerId,
          id: { notIn: matchingIds.length > 0 ? matchingIds : [-1] },
        },
        data: { managerId: null },
      });

      // Assign this manager to all matching properties
      if (matchingIds.length > 0) {
        await prisma.property.updateMany({
          where: {
            id: { in: matchingIds },
          },
          data: { managerId },
        });
      }
    } catch (err: any) {
      console.warn('[API] syncManagerProperties notice:', err.message);
    }
  }

  static async createManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, password, properties, assignedProperties } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();
      const passwordHash = await hashPassword(password || 'demo123');

      const user = await prisma.user.upsert({
        where: { email: cleanEmail },
        update: {
          name: name || undefined,
          phone: phone || undefined,
          passwordHash,
          role: 'manager',
        },
        create: {
          name,
          email: cleanEmail,
          phone,
          passwordHash,
          role: 'manager',
        },
      });

      const propList = assignedProperties || properties;
      if (Array.isArray(propList)) {
        await UserController.syncManagerProperties(user.id, propList);
      }

      return sendSuccess(res, user, 'Manager registered successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async updateManager(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params.id;
      const numericId = parseInt(rawId, 10);
      const { name, email, phone, password, properties, assignedProperties } = req.body;
      const cleanEmail = email ? email.toLowerCase().trim() : undefined;

      let user = null;
      if (!isNaN(numericId)) {
        user = await prisma.user.findUnique({ where: { id: numericId } });
      }
      if (!user && cleanEmail) {
        user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      }

      const dataToUpdate: any = {};
      if (name) dataToUpdate.name = name;
      if (cleanEmail) dataToUpdate.email = cleanEmail;
      if (phone) dataToUpdate.phone = phone;
      if (password) {
        dataToUpdate.passwordHash = await hashPassword(password);
      }

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: dataToUpdate,
        });
      } else if (cleanEmail) {
        user = await prisma.user.create({
          data: {
            name: name || 'Property Manager',
            email: cleanEmail,
            phone: phone || undefined,
            passwordHash: await hashPassword(password || 'demo123'),
            role: 'manager',
          },
        });
      }

      const propList = assignedProperties || properties;
      if (user && Array.isArray(propList)) {
        await UserController.syncManagerProperties(user.id, propList);
      }

      return sendSuccess(res, user, 'Manager updated successfully');
    } catch (error) {
      return next(error);
    }
  }
}
