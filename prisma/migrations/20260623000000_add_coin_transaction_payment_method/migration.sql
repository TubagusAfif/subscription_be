-- Record which payment method (and raw gateway channel) each coin transaction
-- used, so reports can be calculated/filtered by payment method straight from
-- the ledger. Nullable so existing rows are unaffected.
ALTER TABLE "coin_transactions" ADD COLUMN "payment_method_id" INTEGER;
ALTER TABLE "coin_transactions" ADD COLUMN "payment_channel" TEXT;

ALTER TABLE "coin_transactions"
  ADD CONSTRAINT "coin_transactions_payment_method_id_fkey"
  FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
