import { PrismaClient, FeeType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  const adminPassword = process.env.ADMIN_PASSWORD || 'secret123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const superAdminEmail = 'superadmin@superadmin.com';

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: superAdminEmail,
      phone: '00000000001',
      role: 'SUPERADMIN',
      password_hash: hashedPassword,
      is_active: true,
    },
  });

  console.log(`Super Admin user created/verified: ${superAdmin.email}`);

  const adminEmail = 'admin@admin.com';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Admin',
      email: adminEmail,
      phone: '00000000000',
      role: 'ADMIN',
      password_hash: hashedPassword,
      is_active: true,
    },
  });

  console.log(`Admin user created/verified: ${admin.email}`);

  // Seed default coin currency
  const currency = await prisma.coinCurrency.upsert({
    where: { currency_code: 'IDR' },
    update: {
      conversion_rate: 1000.0,
    },
    create: {
      currency_name: 'Indonesian Rupiah',
      currency_code: 'IDR',
      symbol: 'Rp',
      conversion_rate: 1000.0,
      is_active: true,
      effective_from: new Date(),
    },
  });

  // Delete the admin's coin wallet if it was previously created by mistake
  await prisma.coinWallet.deleteMany({ where: { user_id: admin.id } });

  // Create an OWNER user
  const ownerEmail = 'owner@owner.com';
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      name: 'Clinic Owner',
      email: ownerEmail,
      phone: '081234567890',
      role: 'OWNER',
      password_hash: hashedPassword,
      is_active: true,
    },
  });
  console.log(`Owner user created/verified: ${owner.email}`);

  // Create default coin wallet for owner (same as registration flow)
  await prisma.coinWallet.upsert({
    where: { user_id: owner.id },
    update: {},
    create: {
      user_id: owner.id,
      balance: Number(process.env.WALLET_DEFAULT_BALANCE || 300),
      currency_id: currency.id,
      created_by: owner.id,
      updated_by: owner.id,
    },
  });
  console.log(`Owner coin wallet created/verified with default balance`);

  // Seed default payment methods
  const paymentMethods = [
    { name: 'Credit Card', code: 'credit_card', fee_type: FeeType.PERCENTAGE, fee_value: 2.9 },
    { name: 'GoPay', code: 'gopay', fee_type: FeeType.PERCENTAGE, fee_value: 2.0 },
    { name: 'QRIS', code: 'megaqris', fee_type: FeeType.PERCENTAGE, fee_value: 0 },
    { name: 'Virtual Account', code: 'va', fee_type: FeeType.FIXED, fee_value: 4000.0 },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { code: pm.code },
      update: {
        name: pm.name,
        fee_type: pm.fee_type,
        fee_value: pm.fee_value,
      },
      create: {
        name: pm.name,
        code: pm.code,
        fee_type: pm.fee_type,
        fee_value: pm.fee_value,
        is_active: true,
      },
    });
  }
  console.log('Payment methods seeded.');

  // Seed default TRIAL plan
  const trialPlan = await prisma.skuBase.upsert({
    where: { sku_code: 'PLAN_TRIAL' },
    update: {
      sku_name: 'Trial Plan',
      billing_duration_days: 30,
      coin_cost: 0,
    },
    create: {
      sku_name: 'Trial Plan',
      sku_code: 'PLAN_TRIAL',
      sku_type: 'PACKAGE',
      billing_duration_days: 30,
      coin_cost: 0,
      is_active: true,
      features: {
        create: [
          { display_name: 'Basic Dashboard', feature: 'dashboard_basic' },
          { display_name: 'Patient Management', feature: 'patient_management' },
        ],
      },
      benefits: {
        create: [
          { benefit_type: 'clinic', benefit_value: '1', max_usage: 1 },
          { benefit_type: 'user', benefit_value: '3', max_usage: 3 },
        ],
      },
      addons: {
        create: [
          { resource_type: 'CLINIC_ADDON', display_name: 'Extra Clinic', quota_value: 1, description: 'Optional extra clinic' },
          { resource_type: 'USER_ADDON', display_name: 'Extra User', quota_value: 1, description: 'Optional extra user' },
        ],
      },
    },
  });
  console.log(`Trial plan seeded: ${trialPlan.sku_name}`);

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
