CREATE TABLE "seller_support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"author_email" text NOT NULL,
	"message" text NOT NULL,
	"image_path" text,
	"status" text DEFAULT 'open' NOT NULL,
	"admin_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_support_tickets" ADD CONSTRAINT "seller_support_tickets_seller_id_seller_stores_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_stores"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "seller_support_tickets_seller_idx" ON "seller_support_tickets" USING btree ("seller_id");
--> statement-breakpoint
CREATE INDEX "seller_support_tickets_status_idx" ON "seller_support_tickets" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "seller_support_tickets_created_idx" ON "seller_support_tickets" USING btree ("created_at");
