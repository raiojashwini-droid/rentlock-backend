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

  // 2. Ensure ONLY admin@rentlock.com exists (All other users deleted)
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'admin@rentlock.com',
      },
    },
  });

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@rentlock.com' },
  });

  if (!existingAdmin) {
    const defaultPasswordHash = await bcrypt.hash('demo123', 12);
    await prisma.user.create({
      data: {
        name: 'Robert King',
        email: 'admin@rentlock.com',
        passwordHash: defaultPasswordHash,
        role: 'admin',
        phone: '+1 (718) 555-0141',
      },
    });
  } else {
    // Preserve existing admin and their current password
    await prisma.user.update({
      where: { email: 'admin@rentlock.com' },
      data: { name: 'Robert King', role: 'admin' },
    });
  }

  console.log('✅ Clean complete! All properties, units, tenants, tickets, invoices, expenses removed.');
  console.log('✅ ONLY Admin account retained:');
  console.log('   - admin@rentlock.com (Robert King)');

  await prisma.$disconnect();
}

clean().catch((e) => {
  console.error('Clean error:', e);
  process.exit(1);
});
