import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Default Admin Credentials
  const adminEmail = 'admin@company.com';
  const adminPassword = 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      name: 'Super Admin',
      passwordHash,
    },
  });

  console.log(`✅ Admin created/updated: ${admin.email}`);

  // Default Sample Office (Headquarters)
  const office = await prisma.office.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Headquarters Main Campus',
      latitude: 28.535517,
      longitude: 77.391029,
      radiusM: 150,
    },
  });

  console.log(`✅ Default Office created: ${office.name}`);
  console.log('\n=======================================');
  console.log('🔑 ADMIN LOGIN CREDENTIALS:');
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log('=======================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
