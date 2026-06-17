/*
  Warnings:

  - You are about to drop the `user_payment_methods` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_payment_methods" DROP CONSTRAINT "user_payment_methods_user_id_fkey";

-- DropTable
DROP TABLE "user_payment_methods";
