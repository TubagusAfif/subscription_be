import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  const adminPassword = process.env.ADMIN_PASSWORD || 'secret123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminEmail = 'admin@admin.com';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: adminEmail,
      phone: '00000000000',
      role: 'ADMIN',
      password_hash: hashedPassword,
      is_active: true,
    },
  });

  console.log(`Admin user created/verified: ${admin.email}`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
