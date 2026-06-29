-- Defense-in-depth backstop: the wallet balance must never go negative.
-- The application now deducts via a conditional `WHERE balance >= amount`
-- update, but this CHECK constraint guarantees the invariant at the DB level
-- so any future code path (or bug) that tries to overdraw fails the write
-- instead of silently corrupting the ledger.
--
-- NOTE: if any wallet already has a negative balance this will fail. Reconcile
-- those rows first (e.g. set to 0 and record an adjustment) before applying.
ALTER TABLE "coin_wallet"
  ADD CONSTRAINT "coin_wallet_balance_non_negative" CHECK ("balance" >= 0);
