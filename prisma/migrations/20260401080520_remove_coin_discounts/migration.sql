/*
  Warnings:

  - You are about to drop the column `discount_id` on the `coin_orders` table. All the data in the column will be lost.
  - You are about to drop the `coin_discounts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "coin_discounts" DROP CONSTRAINT "coin_discounts_bundle_id_fkey";

-- DropForeignKey
ALTER TABLE "coin_orders" DROP CONSTRAINT "coin_orders_discount_id_fkey";

-- AlterTable
ALTER TABLE "coin_orders" DROP COLUMN "discount_id";

-- DropTable
DROP TABLE "coin_discounts";
