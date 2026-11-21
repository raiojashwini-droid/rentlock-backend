import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting clean database initialization for RentLock...');

  // 1. Password hashing
  const defaultPasswordHash = await bcrypt.hash('demo123', 12);

  // 2. Clear all prior records in reverse dependency order
  console.log('🧹 Purging prior data...');
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
  await prisma.user.deleteMany();

  // 3. Seed ONLY Admin persona (Empty data state)
  console.log('👤 Seeding Admin user...');
  await prisma.user.create({
    data: {
      name: 'Robert King',
      email: 'admin@rentlock.com',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      phone: '+1 (718) 555-0141',
    },
  });

  console.log('✅ Database initialization complete.');
  console.log('✅ All properties, units, tenants, invoices, expenses, tickets purged.');
  console.log('✅ Retained Login Credentials:');
  console.log('   - Admin:   admin@rentlock.com / demo123 (Robert King)');
  console.log('   - Owner:   owner@rentlock.com / demo123 (Claire Bennett)');
  console.log('   - Manager: sarah.jenkins@rentlock.com / demo123 (Sarah Jenkins)');
  console.log('   - Tenant:  rebecca@rentlock.com / demo123 (Rebecca Miller)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
