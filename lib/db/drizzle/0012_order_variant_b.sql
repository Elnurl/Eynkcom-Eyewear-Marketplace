ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "seller_confirm_due_at" timestamptz;
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "payment_due_at" timestamptz;
ALTER TABLE "marketplace_order_items" ADD COLUMN IF NOT EXISTS "stock_deducted" boolean NOT NULL DEFAULT false;