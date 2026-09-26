CREATE TABLE "marketplace_return_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"seller_order_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace_return_requests" ADD CONSTRAINT "marketplace_return_requests_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_return_requests" ADD CONSTRAINT "marketplace_return_requests_seller_order_id_marketplace_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."marketplace_seller_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_return_requests_seller_order_unique" ON "marketplace_return_requests" USING btree ("seller_order_id");--> statement-breakpoint
CREATE INDEX "marketplace_return_requests_order_idx" ON "marketplace_return_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "marketplace_return_requests_status_idx" ON "marketplace_return_requests" USING btree ("status");