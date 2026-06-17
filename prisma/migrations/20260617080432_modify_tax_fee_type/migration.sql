/*
  Warnings:

  - You are about to drop the column `rate_percent` on the `tax_config` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `tax_config` table. All the data in the column will be lost.
  - Changed the type of `fee_type` on the `payment_methods` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `tax_type` to the `tax_config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_value` to the `tax_config` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('FIXED', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "payment_methods" ALTER COLUMN "fee_type" TYPE "FeeType" USING "fee_type"::"text"::"FeeType";

-- AlterTable
ALTER TABLE "tax_config" RENAME COLUMN "rate_percent" TO "tax_value";
ALTER TABLE "tax_config" ALTER COLUMN "tax_value" TYPE DECIMAL(15,2);
ALTER TABLE "tax_config" DROP COLUMN "region";
ALTER TABLE "tax_config" ADD COLUMN "tax_type" "FeeType" NOT NULL DEFAULT 'PERCENTAGE';
ALTER TABLE "tax_config" ALTER COLUMN "tax_type" DROP DEFAULT;
