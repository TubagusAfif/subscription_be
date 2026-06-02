/*
  Warnings:

  - You are about to drop the column `gateway_id` on the `user_payment_methods` table. All the data in the column will be lost.
  - You are about to drop the `payment_gateway_config` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_payment_methods" DROP CONSTRAINT "user_payment_methods_gateway_id_fkey";

-- AlterTable
ALTER TABLE "user_payment_methods" DROP COLUMN "gateway_id";

-- DropTable
DROP TABLE "payment_gateway_config";
