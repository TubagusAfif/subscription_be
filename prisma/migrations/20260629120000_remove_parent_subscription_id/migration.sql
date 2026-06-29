-- AlterTable
-- Drop the parent_subscription_id column and its foreign key constraint
-- Add-ons are now independent subscriptions tied only to user_id
-- The system will check for active package via user_id + sku_type='PACKAGE'

-- Drop foreign key constraint first
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_parent_subscription_id_fkey";

-- Drop the column
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "parent_subscription_id";
