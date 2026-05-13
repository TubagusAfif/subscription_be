-- CreateEnum
CREATE TYPE "SkuType" AS ENUM ('PACKAGE', 'ADDON');

-- CreateEnum
CREATE TYPE "SkuStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PackageTier" AS ENUM ('BASIC', 'LITE', 'MEDIUM', 'PRO', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "sku_base" (
    "id" SERIAL NOT NULL,
    "sku_name" TEXT NOT NULL,
    "sku_code" TEXT NOT NULL,
    "sku_type" "SkuType" NOT NULL,
    "package_tier" "PackageTier",
    "rank" INTEGER NOT NULL DEFAULT 0,
    "billing_duration_days" INTEGER NOT NULL DEFAULT 30,
    "coin_cost" DECIMAL(10,2) NOT NULL,
    "status" "SkuStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "sku_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_benefits" (
    "id" SERIAL NOT NULL,
    "sku_id" INTEGER NOT NULL,
    "benefit_type" TEXT NOT NULL,
    "benefit_value" TEXT,
    "max_usage" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "sku_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_features" (
    "id" SERIAL NOT NULL,
    "sku_id" INTEGER NOT NULL,
    "display_name" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "sku_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_addons" (
    "id" SERIAL NOT NULL,
    "sku_id" INTEGER NOT NULL,
    "resource_type" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "quota_value" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "sku_addons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sku_base_sku_code_key" ON "sku_base"("sku_code");

-- AddForeignKey
ALTER TABLE "sku_benefits" ADD CONSTRAINT "sku_benefits_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "sku_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_features" ADD CONSTRAINT "sku_features_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "sku_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_addons" ADD CONSTRAINT "sku_addons_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "sku_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
