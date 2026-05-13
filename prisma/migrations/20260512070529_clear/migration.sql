/*
  Warnings:

  - You are about to drop the `clinics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `icd_10` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `insurance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `operational_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `operational_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `operational_users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_method` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `snomed_ct` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `resource_type` on the `sku_addons` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('CLINIC_ADDON', 'USER_ADDON');

-- DropForeignKey
ALTER TABLE "clinics" DROP CONSTRAINT "clinics_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "clinics" DROP CONSTRAINT "clinics_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "operational_roles" DROP CONSTRAINT "operational_roles_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "operational_users" DROP CONSTRAINT "operational_users_assigned_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "operational_users" DROP CONSTRAINT "operational_users_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "operational_users" DROP CONSTRAINT "operational_users_role_id_fkey";

-- DropForeignKey
ALTER TABLE "operational_users" DROP CONSTRAINT "operational_users_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "payor" DROP CONSTRAINT "payor_insurance_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- AlterTable
ALTER TABLE "sku_addons" DROP COLUMN "resource_type",
ADD COLUMN     "resource_type" "ResourceType" NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activation_token" TEXT,
ADD COLUMN     "activation_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "reset_token_expires_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "clinics";

-- DropTable
DROP TABLE "icd_10";

-- DropTable
DROP TABLE "insurance";

-- DropTable
DROP TABLE "operational_permissions";

-- DropTable
DROP TABLE "operational_roles";

-- DropTable
DROP TABLE "operational_users";

-- DropTable
DROP TABLE "payment_method";

-- DropTable
DROP TABLE "payor";

-- DropTable
DROP TABLE "role_permissions";

-- DropTable
DROP TABLE "snomed_ct";

-- RenameIndex
ALTER INDEX "coin_orders_midtrans_order_id_key" RENAME TO "coin_orders_pg_order_id_key";
