/*
  Warnings:

  - The values [SENT] on the enum `WebhookOutboxStatus` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `webhook_outbox` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `webhook_outbox` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - Added the required column `updated_at` to the `webhook_outbox` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WebhookOutboxStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "public"."webhook_outbox" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "webhook_outbox" ALTER COLUMN "status" TYPE "WebhookOutboxStatus_new" USING ("status"::text::"WebhookOutboxStatus_new");
ALTER TYPE "WebhookOutboxStatus" RENAME TO "WebhookOutboxStatus_old";
ALTER TYPE "WebhookOutboxStatus_new" RENAME TO "WebhookOutboxStatus";
DROP TYPE "public"."WebhookOutboxStatus_old";
ALTER TABLE "webhook_outbox" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "coin_orders" DROP CONSTRAINT "coin_orders_payment_method_id_fkey";

-- AlterTable
ALTER TABLE "coin_orders" ADD COLUMN     "coin_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gateway_fee" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "webhook_outbox" DROP CONSTRAINT "webhook_outbox_pkey",
ADD COLUMN     "max_attempts" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" TYPE INTEGER,
ALTER COLUMN "idempotency_key" SET DATA TYPE TEXT,
ALTER COLUMN "event_type" SET DATA TYPE TEXT,
ADD CONSTRAINT "webhook_outbox_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fee_type" TEXT NOT NULL,
    "fee_value" DECIMAL(15,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");

-- CreateIndex
CREATE INDEX "webhook_outbox_status_next_attempt_at_idx" ON "webhook_outbox"("status", "next_attempt_at");

-- AddForeignKey
ALTER TABLE "coin_orders" ADD CONSTRAINT "coin_orders_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
