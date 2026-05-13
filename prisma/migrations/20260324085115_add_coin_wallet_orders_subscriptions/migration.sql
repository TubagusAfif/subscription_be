-- CreateEnum
CREATE TYPE "CoinOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('TOPUP', 'SPEND');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'RENEWED', 'ON_HOLD', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "user_payment_methods" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "gateway_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "masked_number" TEXT,
    "token_ref" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "user_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bundle_id" INTEGER,
    "is_custom_qty" BOOLEAN NOT NULL DEFAULT false,
    "coin_amount" INTEGER NOT NULL,
    "payment_method_id" INTEGER,
    "currency_id" INTEGER NOT NULL,
    "price_paid" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_id" INTEGER,
    "status" "CoinOrderStatus" NOT NULL DEFAULT 'PENDING',
    "snap_token" TEXT,
    "redirect_url" TEXT,
    "midtrans_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "coin_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_wallet" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_id" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "coin_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" SERIAL NOT NULL,
    "wallet_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "CoinTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency_id" INTEGER NOT NULL,
    "conversion_rate_snapshot" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "ref_id" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sku_id" INTEGER NOT NULL,
    "sku_type" "SkuType" NOT NULL,
    "parent_subscription_id" INTEGER,
    "purchase_token" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "current_billing_start" DATE,
    "current_billing_end" DATE,
    "next_billing_date" DATE,
    "canceled_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_quotas" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "package_subscription_id" INTEGER NOT NULL,
    "resource_type" TEXT NOT NULL,
    "total_quota" INTEGER NOT NULL,
    "used_quota" INTEGER NOT NULL DEFAULT 0,
    "last_recalculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "subscription_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_slot_map" (
    "id" SERIAL NOT NULL,
    "addon_subscription_id" INTEGER NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "addon_slot_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sku_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "renewal_index" INTEGER NOT NULL DEFAULT 0,
    "coin_amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "promo_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_orders_midtrans_order_id_key" ON "coin_orders"("midtrans_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "coin_wallet_user_id_key" ON "coin_wallet"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_purchase_token_key" ON "subscriptions"("purchase_token");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- AddForeignKey
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "payment_gateway_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_orders" ADD CONSTRAINT "coin_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_orders" ADD CONSTRAINT "coin_orders_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "coin_bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_orders" ADD CONSTRAINT "coin_orders_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "user_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_orders" ADD CONSTRAINT "coin_orders_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "coin_currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_orders" ADD CONSTRAINT "coin_orders_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "coin_discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_wallet" ADD CONSTRAINT "coin_wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_wallet" ADD CONSTRAINT "coin_wallet_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "coin_currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "coin_wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "coin_currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "sku_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_parent_subscription_id_fkey" FOREIGN KEY ("parent_subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_quotas" ADD CONSTRAINT "subscription_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_quotas" ADD CONSTRAINT "subscription_quotas_package_subscription_id_fkey" FOREIGN KEY ("package_subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_slot_map" ADD CONSTRAINT "addon_slot_map_addon_subscription_id_fkey" FOREIGN KEY ("addon_subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "sku_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
