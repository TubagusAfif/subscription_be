/*
  Warnings:

  - You are about to drop the column `status` on the `sku_base` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sku_base" DROP COLUMN "status";

-- DropEnum
DROP TYPE "SkuStatus";
