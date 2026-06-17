import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding dummy coin orders...');

  const ownerEmail = 'owner@owner.com';
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });

  if (!owner) {
    throw new Error('Owner user not found. Please run regular seed first.');
  }

  const currency = await prisma.coinCurrency.findFirst({ where: { currency_code: 'IDR' } });
  if (!currency) {
    throw new Error('IDR currency not found.');
  }

  const paymentMethods = await prisma.paymentMethod.findMany();
  if (paymentMethods.length === 0) {
    throw new Error('No payment methods found.');
  }

  // Create 50 dummy orders over the last 30 days
  const now = new Date();
  
  const dummyOrders = [];
  
  for (let i = 1; i <= 50; i++) {
    // Pick random day within last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);

    // Random values
    const coinAmount = Math.floor(Math.random() * 50) * 10 + 100; // 100 to 600
    const coinPrice = coinAmount * 1000;
    const taxAmount = coinPrice * 0.11;
    const gatewayFee = 4000;
    const pricePaid = coinPrice + taxAmount + gatewayFee;

    // Random payment method
    const pm = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]!;
    
    dummyOrders.push({
      user_id: owner.id,
      is_custom_qty: true,
      coin_amount: coinAmount,
      payment_method_id: pm.id,
      currency_id: currency.id,
      coin_price: coinPrice,
      tax_amount: taxAmount,
      gateway_fee: gatewayFee,
      price_paid: pricePaid,
      status: 'PAID',
      pg_order_id: `DUMMY-ORD-${Date.now()}-${i}`,
      created_at: orderDate,
    });
  }

  // Insert all
  for (const orderData of dummyOrders) {
    // Explicitly set the type to any to bypass strict type checking for the seed script
    await prisma.coinOrder.create({ data: orderData as any });
  }

  console.log(`Successfully created ${dummyOrders.length} dummy orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
