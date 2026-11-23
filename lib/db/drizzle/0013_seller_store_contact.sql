ALTER TABLE "seller_stores" ADD COLUMN IF NOT EXISTS "phone" text NOT NULL DEFAULT '';

UPDATE "seller_stores" AS store
SET "phone" = application.phone
FROM (
  SELECT DISTINCT ON (lower(email)) email, phone
  FROM "seller_applications"
  WHERE trim(phone) <> ''
  ORDER BY lower(email), created_at DESC
) AS application
WHERE lower(store.owner_email) = lower(application.email)
  AND trim(store.phone) = '';
