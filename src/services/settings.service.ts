import { prisma } from '../config/database.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../config/constants.js';
import { AuthUserPayload } from '../types/index.js';

export class SettingsService {
  static async getUserRbac(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { permissions: true },
    });

    if (!user) throw new Error('User not found');

    if (user.permissions) {
      return {
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: {
          canViewTenants: user.permissions.canViewTenants,
          canAddTenants: user.permissions.canAddTenants,
          canEditTenants: user.permissions.canEditTenants,
          canDeleteTenants: user.permissions.canDeleteTenants,
          canViewProperties: user.permissions.canViewProperties,
          canAddProperties: user.permissions.canAddProperties,
          canEditProperties: user.permissions.canEditProperties,
          canDeleteProperties: user.permissions.canDeleteProperties,
          isCustomOverride: true,
        },
      };
    }

    return {
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: {
        ...DEFAULT_ROLE_PERMISSIONS[user.role],
        isCustomOverride: false,
      },
    };
  }

  static async updateUserRbac(
    email: string,
    permissions: any,
    reason: string,
    adminUser: AuthUserPayload
  ) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { permissions: true },
    });

    if (!user) throw new Error('User not found');

    const updated = await prisma.userPermission.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        canViewTenants: permissions.canViewTenants,
        canAddTenants: permissions.canAddTenants,
        canEditTenants: permissions.canEditTenants,
        canDeleteTenants: permissions.canDeleteTenants,
        canViewProperties: permissions.canViewProperties,
        canAddProperties: permissions.canAddProperties,
        canEditProperties: permissions.canEditProperties,
        canDeleteProperties: permissions.canDeleteProperties,
      },
      update: {
        canViewTenants: permissions.canViewTenants,
        canAddTenants: permissions.canAddTenants,
        canEditTenants: permissions.canEditTenants,
        canDeleteTenants: permissions.canDeleteTenants,
        canViewProperties: permissions.canViewProperties,
        canAddProperties: permissions.canAddProperties,
        canEditProperties: permissions.canEditProperties,
        canDeleteProperties: permissions.canDeleteProperties,
      },
    });

    // Record Immutable Audit Log
    await prisma.auditLog.create({
      data: {
        auditId: `AUD-${Date.now()}`,
        userId: adminUser.id,
        userLabel: `${adminUser.name} (Admin)`,
        action: 'Updated Account Permissions',
        target: `${user.name} (${user.role})`,
        reason,
      },
    });

    return updated;
  }

  static async resetUserRbac(email: string, reason: string | undefined, adminUser: AuthUserPayload) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { permissions: true },
    });

    if (!user) throw new Error('User not found');

    if (user.permissions) {
      await prisma.userPermission.delete({
        where: { userId: user.id },
      });
    }

    await prisma.auditLog.create({
      data: {
        auditId: `AUD-${Date.now()}`,
        userId: adminUser.id,
        userLabel: `${adminUser.name} (Admin)`,
        action: 'Reset User Permissions to Role Defaults',
        target: `${user.name} (${user.role})`,
        reason: reason || 'Reset user to standard tier policy',
      },
    });

    return { success: true, message: 'User permissions reset to role defaults' };
  }

  static async listAuditLogs(query: any) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { items, total, page, limit };
  }
}
