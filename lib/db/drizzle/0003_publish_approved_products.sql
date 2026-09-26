UPDATE "seller_products"
SET "status" = 'Aktiv', "updated_at" = now()
WHERE "approval_status" = 'approved' AND "status" <> 'Aktiv';
