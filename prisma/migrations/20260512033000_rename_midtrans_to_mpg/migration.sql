-- AlterTable: rename midtrans_order_id to pg_order_id
ALTER TABLE "coin_orders" RENAME COLUMN "midtrans_order_id" TO "pg_order_id";

-- AlterTable: add pg_response_id column
ALTER TABLE "coin_orders" ADD COLUMN "pg_response_id" TEXT;

-- CreateIndex: unique constraint on pg_response_id
CREATE UNIQUE INDEX "coin_orders_pg_response_id_key" ON "coin_orders"("pg_response_id");
