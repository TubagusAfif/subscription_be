-- Flags an "unlimited" cap for a resource (clinic/user). When true, the numeric
-- cap (max_usage / total_quota) is ignored and slot assignment is never blocked.
-- Source of truth lives on the SKU benefit; the runtime copy on the quota row is
-- what the /slots/assign enforcement reads.
ALTER TABLE "sku_benefits" ADD COLUMN "is_unlimited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscription_quotas" ADD COLUMN "is_unlimited" BOOLEAN NOT NULL DEFAULT false;
