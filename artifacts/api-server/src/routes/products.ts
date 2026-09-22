import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, sellerProductsTable } from "@workspace/db";
import {
  CreateSellerProductBody,
  CreateSellerProductResponse,
  DeleteSellerProductParams,
  ListProductsResponse,
  ListSellerProductsResponse,
  UpdateSellerProductBody,
  UpdateSellerProductParams,
  UpdateSellerProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const DEMO_SELLER_ID = "demo-seller";

function containsInlineImage(value: string | undefined): boolean {
  return value?.startsWith("data:") ?? false;
}

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(sellerProductsTable)
    .where(eq(sellerProductsTable.status, "Aktiv"))
    .orderBy(desc(sellerProductsTable.createdAt));

  res.json(ListProductsResponse.parse(products));
});

router.get("/seller/products", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(sellerProductsTable)
    .where(eq(sellerProductsTable.sellerId, DEMO_SELLER_ID))
    .orderBy(desc(sellerProductsTable.createdAt));

  res.json(ListSellerProductsResponse.parse(products));
});

router.post("/seller/products", async (req, res): Promise<void> => {
  const parsed = CreateSellerProductBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.issues }, "Invalid seller product");
    res.status(400).json({ error: "Məhsul məlumatları düzgün deyil." });
    return;
  }

  if (containsInlineImage(parsed.data.frontImage) || containsInlineImage(parsed.data.sideImage)) {
    res.status(400).json({
      error: "Şəkillər database-ə base64 kimi yazılmır. Public şəkil yolu istifadə edin.",
    });
    return;
  }

  const [product] = await db
    .insert(sellerProductsTable)
    .values({
      id: randomUUID(),
      sellerId: DEMO_SELLER_ID,
      ...parsed.data,
    })
    .returning();

  req.log.info({ productId: product.id }, "Seller product created");
  res.status(201).json(CreateSellerProductResponse.parse(product));
});

router.patch("/seller/products/:id", async (req, res): Promise<void> => {
  const params = UpdateSellerProductParams.safeParse(req.params);
  const parsed = UpdateSellerProductBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Məhsul yeniləməsi düzgün deyil." });
    return;
  }

  if (containsInlineImage(parsed.data.frontImage) || containsInlineImage(parsed.data.sideImage)) {
    res.status(400).json({
      error: "Şəkillər database-ə base64 kimi yazılmır. Public şəkil yolu istifadə edin.",
    });
    return;
  }

  const [product] = await db
    .update(sellerProductsTable)
    .set(parsed.data)
    .where(
      and(
        eq(sellerProductsTable.id, params.data.id),
        eq(sellerProductsTable.sellerId, DEMO_SELLER_ID),
      ),
    )
    .returning();

  if (!product) {
    res.status(404).json({ error: "Məhsul tapılmadı." });
    return;
  }

  req.log.info({ productId: product.id }, "Seller product updated");
  res.json(UpdateSellerProductResponse.parse(product));
});

router.delete("/seller/products/:id", async (req, res): Promise<void> => {
  const params = DeleteSellerProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Məhsul identifikatoru düzgün deyil." });
    return;
  }

  const [product] = await db
    .delete(sellerProductsTable)
    .where(
      and(
        eq(sellerProductsTable.id, params.data.id),
        eq(sellerProductsTable.sellerId, DEMO_SELLER_ID),
      ),
    )
    .returning({ id: sellerProductsTable.id });

  if (!product) {
    res.status(404).json({ error: "Məhsul tapılmadı." });
    return;
  }

  req.log.info({ productId: product.id }, "Seller product deleted");
  res.sendStatus(204);
});

export default router;