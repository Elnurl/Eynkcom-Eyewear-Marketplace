CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "seller_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"store_name" text NOT NULL,
	"owner_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"business" text NOT NULL,
	"tax" text DEFAULT '' NOT NULL,
	"address" text NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"categories" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_products" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer NOT NULL,
	"color" text NOT NULL,
	"material" text NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"gender" text DEFAULT 'Uniseks' NOT NULL,
	"shape" text DEFAULT 'Square' NOT NULL,
	"size" text DEFAULT 'M (50–20)' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"moderation_note" text,
	"front_image" text NOT NULL,
	"side_image" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_image_uploads" (
	"object_path" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"finalized_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "seller_stores" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"location" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_order_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"seller_order_id" text,
	"status" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_qepik" integer NOT NULL,
	"line_total_qepik" integer NOT NULL,
	"stock_released" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_order_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"seller_order_id" text NOT NULL,
	"refund_qepik" integer NOT NULL,
	"product_refund_qepik" integer NOT NULL,
	"reference" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"access_token_hash" text NOT NULL,
	"buyer_user_id" varchar,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"delivery_area" text NOT NULL,
	"delivery_address" text NOT NULL,
	"delivery_note" text DEFAULT '' NOT NULL,
	"payment_method" text NOT NULL,
	"payment_status" text NOT NULL,
	"status" text NOT NULL,
	"product_subtotal_qepik" integer NOT NULL,
	"delivery_total_qepik" integer,
	"total_qepik" integer,
	"refunded_qepik" integer DEFAULT 0 NOT NULL,
	"buyer_approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_seller_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"status" text NOT NULL,
	"product_subtotal_qepik" integer NOT NULL,
	"delivery_fee_qepik" integer,
	"commission_qepik" integer,
	"seller_earnings_qepik" integer,
	"refunded_qepik" integer DEFAULT 0 NOT NULL,
	"product_refunded_qepik" integer DEFAULT 0 NOT NULL,
	"tracking_code" text,
	"collected_at_delivery" boolean,
	"confirmed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_settlement_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"seller_order_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"product_sales_qepik" integer NOT NULL,
	"delivery_fee_qepik" integer NOT NULL,
	"commission_qepik" integer NOT NULL,
	"seller_earnings_qepik" integer NOT NULL,
	"status" text DEFAULT 'payable' NOT NULL,
	"settlement_reference" text,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace_order_events" ADD CONSTRAINT "marketplace_order_events_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_events" ADD CONSTRAINT "marketplace_order_events_seller_order_id_marketplace_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."marketplace_seller_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_items" ADD CONSTRAINT "marketplace_order_items_seller_order_id_marketplace_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."marketplace_seller_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_refunds" ADD CONSTRAINT "marketplace_order_refunds_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_refunds" ADD CONSTRAINT "marketplace_order_refunds_seller_order_id_marketplace_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."marketplace_seller_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_seller_orders" ADD CONSTRAINT "marketplace_seller_orders_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_settlement_ledger" ADD CONSTRAINT "marketplace_settlement_ledger_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_settlement_ledger" ADD CONSTRAINT "marketplace_settlement_ledger_seller_order_id_marketplace_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."marketplace_seller_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "seller_applications_email_idx" ON "seller_applications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "seller_applications_status_idx" ON "seller_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seller_products_seller_id_idx" ON "seller_products" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_products_status_idx" ON "seller_products" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_stores_owner_email_unique" ON "seller_stores" USING btree ("owner_email");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_stores_slug_unique" ON "seller_stores" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "seller_stores_status_idx" ON "seller_stores" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketplace_order_events_order_idx" ON "marketplace_order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "marketplace_order_events_created_idx" ON "marketplace_order_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "marketplace_order_items_seller_order_idx" ON "marketplace_order_items" USING btree ("seller_order_id");--> statement-breakpoint
CREATE INDEX "marketplace_order_items_product_idx" ON "marketplace_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "marketplace_order_refunds_order_idx" ON "marketplace_order_refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "marketplace_order_refunds_seller_order_idx" ON "marketplace_order_refunds" USING btree ("seller_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_order_refunds_reference_unique" ON "marketplace_order_refunds" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_orders_order_number_unique" ON "marketplace_orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_orders_access_token_hash_unique" ON "marketplace_orders" USING btree ("access_token_hash");--> statement-breakpoint
CREATE INDEX "marketplace_orders_status_idx" ON "marketplace_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketplace_orders_created_at_idx" ON "marketplace_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "marketplace_orders_buyer_user_idx" ON "marketplace_orders" USING btree ("buyer_user_id");--> statement-breakpoint
CREATE INDEX "marketplace_seller_orders_order_idx" ON "marketplace_seller_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "marketplace_seller_orders_seller_idx" ON "marketplace_seller_orders" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "marketplace_seller_orders_status_idx" ON "marketplace_seller_orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_seller_orders_order_seller_unique" ON "marketplace_seller_orders" USING btree ("order_id","seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_settlement_seller_order_unique" ON "marketplace_settlement_ledger" USING btree ("seller_order_id");--> statement-breakpoint
CREATE INDEX "marketplace_settlement_seller_idx" ON "marketplace_settlement_ledger" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "marketplace_settlement_status_idx" ON "marketplace_settlement_ledger" USING btree ("status");