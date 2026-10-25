ALTER TABLE "seller_support_tickets" ALTER COLUMN "seller_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "seller_support_tickets" ADD COLUMN "author_type" text DEFAULT 'seller' NOT NULL;
--> statement-breakpoint
CREATE TABLE "support_image_uploads" (
	"object_path" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"finalized_at" timestamp with time zone
);
