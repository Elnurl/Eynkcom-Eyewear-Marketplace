CREATE TABLE IF NOT EXISTS "stored_objects" (
  "object_path" text PRIMARY KEY,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "body" bytea NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
