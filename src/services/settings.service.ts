import { prisma } from '../config/database.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../config/constants.js';
import { AuthUserPayload } from '../types/index.js';

export class SettingsService {
  private static companySettings = {
    companyName: 'RentLock Management Group LLC',
    ein: 'XX-XXXXXXX',
    supportEmail: 'admin@rentlock.com',
    supportPhone: '+1 (555) 019-2834',
    address: '100 Wall Street, Suite 1200, New York, NY 10005',
    currency: 'USD ($)',
    dateFormat: 'MM/DD/YYYY',
    fiscalYearStart: 'January 1',
    timezone: 'America/New_York (EST)',
    accountingBasis: 'Accrual Basis',
    lateFeeGracePeriodDays: 5,
    standardSecurityDepositMonths: 1.5,
  };

  static async getCompanySettings() {
    return this.companySettings;
  }

  static async updateCompanySettings(data: any) {
    this.companySettings = {
      ...this.companySettings,
      ...data,
    };
    return this.companySettings;
  }

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

  static async purgeAllData() {
    await prisma.auditLog.deleteMany();
    await prisma.message.deleteMany();
    await prisma.messageThread.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.ledgerAdjustment.deleteMany();
    await prisma.securityDeposit.deleteMany();
    await prisma.maintenanceTicket.deleteMany();
    await prisma.preventiveSchedule.deleteMany();
    await prisma.propertyDocument.deleteMany();
    await prisma.visitorPass.deleteMany();
    await prisma.parkingStall.deleteMany();
    await prisma.broadcast.deleteMany();
    await prisma.staff.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.userPermission.deleteMany();

    await prisma.user.deleteMany({
      where: {
        email: {
          not: 'admin@rentlock.com',
        },
      },
    });

    return {
      success: true,
      message: 'All operational data and non-admin accounts successfully purged. Only Admin retained.',
    };
  }

  // -------------------- COMPANY DEFAULTS & LOCALE --------------------
  private static cachedCompanySettings: any = {
    companyName: 'RentLock Property Holdings LLC',
    ein: '84-2910482',
    supportEmail: 'operations@rentlock.com',
    supportPhone: '+1 (718) 555-0100',
    address: '450 Lexington Ave, Suite 1800, New York, NY 10017',
    currency: 'USD ($)',
    dateFormat: 'MM/DD/YYYY',
    fiscalYearStart: 'January 1',
    timezone: 'America/New_York (EST)',
    accountingBasis: 'Accrual Basis (GAAP)',
    lateFeeGracePeriodDays: 5,
    standardSecurityDepositMonths: 1,
  };

  static async getCompanySettings() {
    try {
      const latest = await prisma.auditLog.findFirst({
        where: { action: 'COMPANY_SETTINGS_SNAPSHOT' },
        orderBy: { createdAt: 'desc' },
      });
      if (latest && latest.reason) {
        try {
          const parsed = JSON.parse(latest.reason);
          SettingsService.cachedCompanySettings = {
            ...SettingsService.cachedCompanySettings,
            ...parsed,
          };
        } catch {}
      }
    } catch (err: any) {
      console.warn('[SettingsService] Read company settings notice:', err?.message);
    }
    return SettingsService.cachedCompanySettings;
  }

  static async updateCompanySettings(data: any, adminUser?: any) {
    const merged = {
      ...SettingsService.cachedCompanySettings,
      ...data,
    };
    SettingsService.cachedCompanySettings = merged;

    try {
      await prisma.auditLog.create({
        data: {
          auditId: `AUD-${Date.now()}`,
          userId: adminUser?.id,
          userLabel: adminUser?.name ? `${adminUser.name} (${adminUser.role || 'Admin'})` : 'Robert King (Admin)',
          action: 'COMPANY_SETTINGS_SNAPSHOT',
          target: merged.companyName || 'RentLock Property Holdings LLC',
          beforeAfter: merged.ein || '84-2910482',
          reason: JSON.stringify(merged),
        },
      });
    } catch (err: any) {
      console.warn('[SettingsService] Write company settings notice:', err?.message);
    }

    return merged;
  }
}
