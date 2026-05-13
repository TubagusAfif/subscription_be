-- CreateTable
CREATE TABLE "coin_currencies" (
    "id" SERIAL NOT NULL,
    "currency_name" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "conversion_rate" DECIMAL(10,4) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "coin_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_bundles" (
    "id" SERIAL NOT NULL,
    "bundle_name" TEXT NOT NULL,
    "coin_amount" INTEGER NOT NULL,
    "currency_id" INTEGER NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "discounted_price" DECIMAL(15,2),
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "coin_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_discounts" (
    "id" SERIAL NOT NULL,
    "bundle_id" INTEGER NOT NULL,
    "promo_code" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL,
    "discount_value" DECIMAL(15,2) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "max_redemptions" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "coin_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_currencies_currency_code_key" ON "coin_currencies"("currency_code");

-- CreateIndex
CREATE UNIQUE INDEX "coin_discounts_promo_code_key" ON "coin_discounts"("promo_code");

-- AddForeignKey
ALTER TABLE "coin_bundles" ADD CONSTRAINT "coin_bundles_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "coin_currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_discounts" ADD CONSTRAINT "coin_discounts_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "coin_bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
