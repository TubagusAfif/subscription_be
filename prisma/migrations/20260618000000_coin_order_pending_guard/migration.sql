-- Enforce at most one active PENDING coin order per user.
-- This is the race-safe guard: the application-level check in
-- CoinOrderService is best-effort and can be bypassed by concurrent
-- (double-submit) requests, so the invariant is enforced in the DB.
--
-- NOTE: if duplicate PENDING orders already exist this index creation
-- will fail. Resolve duplicates first (e.g. expire all but the newest
-- PENDING order per user) before applying.
CREATE UNIQUE INDEX "coin_orders_one_pending_per_user"
  ON "coin_orders" ("user_id")
  WHERE "status" = 'PENDING' AND "deleted_at" IS NULL;
