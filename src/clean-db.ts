import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Purging all data from database while preserving login users...');

  // 1. Delete all operational and financial records
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

  // 2. Ensure only the 4 login persona users exist
  const defaultPasswordHash = await bcrypt.hash('demo123', 12);

  // Remove any non-default users
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: [
          'admin@rentlock.com',
          'owner@rentlock.com',
          'sarah.jenkins@rentlock.com',
          'rebecca@rentlock.com',
        ],
      },
    },
  });

  // Upsert the 4 login personas
  await prisma.user.upsert({
    where: { email: 'admin@rentlock.com' },
    update: { passwordHash: defaultPasswordHash, name: 'Robert King', role: 'admin' },
    create: {
      name: 'Robert King',
      email: 'admin@rentlock.com',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      phone: '+1 (718) 555-0141',
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@rentlock.com' },
    update: { passwordHash: defaultPasswordHash, name: 'Claire Bennett', role: 'owner' },
    create: {
      name: 'Claire Bennett',
      email: 'owner@rentlock.com',
      passwordHash: defaultPasswordHash,
      role: 'owner',
      phone: '+1 (212) 555-0188',
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'sarah.jenkins@rentlock.com' },
    update: { passwordHash: defaultPasswordHash, name: 'Sarah Jenkins', role: 'manager' },
    create: {
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@rentlock.com',
      passwordHash: defaultPasswordHash,
      role: 'manager',
      phone: '+1 (718) 555-0192',
    },
  });

  await prisma.userPermission.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: {
      userId: managerUser.id,
      canViewTenants: true,
      canAddTenants: true,
      canEditTenants: true,
      canDeleteTenants: false,
      canViewProperties: true,
      canAddProperties: false,
      canEditProperties: true,
      canDeleteProperties: false,
    },
  });

  await prisma.user.upsert({
    where: { email: 'rebecca@rentlock.com' },
    update: { passwordHash: defaultPasswordHash, name: 'Rebecca Miller', role: 'tenant' },
    create: {
      name: 'Rebecca Miller',
      email: 'rebecca@rentlock.com',
      passwordHash: defaultPasswordHash,
      role: 'tenant',
      phone: '+1 (347) 555-0118',
    },
  });

  console.log('✅ Clean complete! All properties, units, tenants, tickets, invoices, expenses removed.');
  console.log('✅ Retained login accounts:');
  console.log('   - admin@rentlock.com (Robert King)');
  console.log('   - owner@rentlock.com (Claire Bennett)');
  console.log('   - sarah.jenkins@rentlock.com (Sarah Jenkins)');
  console.log('   - rebecca@rentlock.com (Rebecca Miller)');

  await prisma.$disconnect();
}

clean().catch((e) => {
  console.error('Clean error:', e);
  process.exit(1);
});
