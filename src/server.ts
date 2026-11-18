import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, prisma } from './config/database.js';

async function bootstrap() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`
🚀 =========================================================
🏢 RentLock Enterprise Property Management REST API
🌐 Server running on: http://localhost:${env.PORT}
📡 Base API endpoint: http://localhost:${env.PORT}/api/v1
🩺 Health check:      http://localhost:${env.PORT}/health
📁 Mode:              ${env.NODE_ENV.toUpperCase()}
=========================================================
    `);
  });

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${env.PORT} is already in use by another process.`);
      console.error(`💡 Run this in PowerShell to free port ${env.PORT}:`);
      console.error(`   Stop-Process -Id (Get-NetTCPConnection -LocalPort ${env.PORT}).OwningProcess -Force\n`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('✅ MySQL connection closed. Server terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('❌ Fatal bootstrap failure:', error);
  process.exit(1);
});
