import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateSellerProductBody,
  CreateSellerProductResponse,
  DeleteSellerProductParams,
  ListAdminProductsQueryParams,
  ListAdminProductsResponse,
  ListProductsResponse,
  ListSellerProductsResponse,
  ReviewSellerProductBody,
  ReviewSellerProductParams,
  ReviewSellerProductResponse,
  UpdateSellerProductBody,
  UpdateSellerProductParams,
  UpdateSellerProductResponse,
} from "@workspace/api-zod";
import { db, sellerProductsTable, sellerStoresTable } from "@workspace/db";
import { requireMarketplaceAdmin, requireUserEmail } from "./access";

const router: IRouter = Router();

function serializeSellerProduct(product: typeof sellerProductsTable.$inferSelect) {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function containsInlineImage(value: string | undefined): boolean {
  return value?.startsWith("data:") ?? false;
}

async function findApprovedStore(email: string) {
  const [store] = await db
    .select()
    .from(sellerStoresTable)
    .where(and(eq(sellerStoresTable.ownerEmail, email), eq(sellerStoresTable.status, "active")))
    .limit(1);
  return store;
}

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db
    .select({ product: sellerProductsTable, store: sellerStoresTable })
    .from(sellerProductsTable)
    .innerJoin(sellerStoresTable, eq(sellerProductsTable.sellerId, sellerStoresTable.id))
    .where(
      and(
        eq(sellerProductsTable.status, "Aktiv"),
        eq(sellerProductsTable.approvalStatus, "approved"),
        eq(sellerStoresTable.status, "active"),
      ),
    )
    .orderBy(desc(sellerProductsTable.createdAt));

  res.json(
    ListProductsResponse.parse(
      products.map(({ product, store }) => ({
        id: product.id,
        sellerId: product.sellerId,
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        color: product.color,
        material: product.material,
        brand: product.brand,
        gender: product.gender,
        shape: product.shape,
        size: product.size,
        description: product.description,
        frontImage: product.frontImage,
        sideImage: product.sideImage,
        vendor: store.name,
        vendorSlug: store.slug,
        location: store.location,
        isAvailable: product.stock > 0,
      })),
    ),
  );
});

router.get("/seller/products", async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const store = await findApprovedStore(email);
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }
  const products = await db
    .select()
    .from(sellerProductsTable)
    .where(eq(sellerProductsTable.sellerId, store.id))
    .orderBy(desc(sellerProductsTable.createdAt));
  res.json(ListSellerProductsResponse.parse(products.map(serializeSellerProduct)));
});

router.post("/seller/products", async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const store = await findApprovedStore(email);
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }
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
      sellerId: store.id,
      ...parsed.data,
      approvalStatus: "pending",
      moderationNote: null,
    })
    .returning();
  req.log.info({ productId: product.id, sellerId: store.id }, "Seller product created for review");
  res.status(201).json(CreateSellerProductResponse.parse(serializeSellerProduct(product)));
});

router.patch("/seller/products/:id", async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const store = await findApprovedStore(email);
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }

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

  const publicContentChanged = Object.keys(parsed.data).some(
    (key) => key !== "stock" && key !== "status",
  );
  const [product] = await db
    .update(sellerProductsTable)
    .set({
      ...parsed.data,
      ...(publicContentChanged ? { approvalStatus: "pending", moderationNote: null } : {}),
    })
    .where(and(eq(sellerProductsTable.id, params.data.id), eq(sellerProductsTable.sellerId, store.id)))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Məhsul tapılmadı." });
    return;
  }

  req.log.info({ productId: product.id }, "Seller product updated");
  res.json(UpdateSellerProductResponse.parse(serializeSellerProduct(product)));
});

router.delete("/seller/products/:id", async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const store = await findApprovedStore(email);
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }

  const params = DeleteSellerProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Məhsul identifikatoru düzgün deyil." });
    return;
  }
  const [product] = await db
    .delete(sellerProductsTable)
    .where(and(eq(sellerProductsTable.id, params.data.id), eq(sellerProductsTable.sellerId, store.id)))
    .returning({ id: sellerProductsTable.id });
  if (!product) {
    res.status(404).json({ error: "Məhsul tapılmadı." });
    return;
  }
  req.log.info({ productId: product.id }, "Seller product deleted");
  res.sendStatus(204);
});

router.get("/admin/products", async (req, res): Promise<void> => {
  if (!requireMarketplaceAdmin(req, res)) return;
  const query = ListAdminProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Məhsul filtri düzgün deyil." });
    return;
  }
  const products = await db
    .select()
    .from(sellerProductsTable)
    .where(
      query.data.approvalStatus
        ? eq(sellerProductsTable.approvalStatus, query.data.approvalStatus)
        : undefined,
    )
    .orderBy(desc(sellerProductsTable.updatedAt));
  res.json(ListAdminProductsResponse.parse(products.map(serializeSellerProduct)));
});

router.patch("/admin/products/:id/approval", async (req, res): Promise<void> => {
  if (!requireMarketplaceAdmin(req, res)) return;
  const params = ReviewSellerProductParams.safeParse(req.params);
  const body = ReviewSellerProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Məhsul moderasiyası düzgün deyil." });
    return;
  }
  const [product] = await db
    .update(sellerProductsTable)
    .set({ approvalStatus: body.data.approvalStatus, moderationNote: body.data.moderationNote ?? null })
    .where(eq(sellerProductsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Məhsul tapılmadı." });
    return;
  }
  res.json(ReviewSellerProductResponse.parse(serializeSellerProduct(product)));
});

export default router;