-- Unlimited add-ons: when true, quota_value is ignored and the add-on grants
-- uncapped slots (the package quota row's is_unlimited is flipped on purchase).
ALTER TABLE "sku_addons" ADD COLUMN "is_unlimited" BOOLEAN NOT NULL DEFAULT false;

-- Slots are now attributed to the specific source subscription that provided
-- them. These indexes back the addon-expiry revocation sweep (lookup by source)
-- and the slot release lookup (by ref).
CREATE INDEX "addon_slot_map_addon_subscription_id_deleted_at_idx" ON "addon_slot_map" ("addon_subscription_id", "deleted_at");
CREATE INDEX "addon_slot_map_ref_id_ref_type_idx" ON "addon_slot_map" ("ref_id", "ref_type");
