-- Split the single `code` column into gateway-specific codes.
-- Existing values are preserved into `midtrans_code` (Midtrans is the default
-- gateway). `bank_mega_code` starts NULL and is populated by the seed/admin.

-- DropIndex
DROP INDEX "payment_methods_code_key";

-- Rename existing column to midtrans_code (keeps current data).
ALTER TABLE "payment_methods" RENAME COLUMN "code" TO "midtrans_code";

-- Allow NULLs now that the code is gateway-specific.
ALTER TABLE "payment_methods" ALTER COLUMN "midtrans_code" DROP NOT NULL;

-- AddColumn
ALTER TABLE "payment_methods" ADD COLUMN "bank_mega_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_bank_mega_code_key" ON "payment_methods"("bank_mega_code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_midtrans_code_key" ON "payment_methods"("midtrans_code");
