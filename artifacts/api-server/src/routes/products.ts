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
import { cleanupReplacedImages, imageBelongsToSeller, isUploadedImage } from "../lib/productImages";
import { deleteSellerProductFromVto, syncSellerProductToVto, vtoConfigured } from "../lib/eynekVto";
import { requireAuth } from "../middlewares/requireAuth";
import { BULK_IMPORT_MAX_ROWS, type BulkImportFailure } from "../lib/bulkProductImport";

function queueVtoSync(
  log: { info: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void },
  product: { id: string; name: string; size: string; frontImage: string; sideImage: string },
  seller: string,
) {
  if (!vtoConfigured()) return;
  void syncSellerProductToVto({
    id: product.id,
    name: product.name,
    size: product.size,
    frontImage: product.frontImage,
    sideImage: product.sideImage,
    seller,
  })
    .then((result) => {
      if (!result.ok) log.warn({ productId: product.id, error: result.error }, "VTO sync failed");
      else log.info({ productId: product.id }, "VTO product synced");
    })
    .catch((error: unknown) => {
      log.warn({ productId: product.id, error }, "VTO sync crashed");
    });
}

const router: IRouter = Router();

function serializeSellerProduct(product: typeof sellerProductsTable.$inferSelect) {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function validImages(
  front: string | undefined,
  side: string | undefined,
  sellerId: string,
  previous?: { frontImage: string; sideImage: string },
) {
  for (const [path, old] of [[front, previous?.frontImage], [side, previous?.sideImage]]) {
    if (!path) continue;
    if (path === old) continue;
    if (isUploadedImage(path) && path !== old && !(await imageBelongsToSeller(path, sellerId))) return false;
    if (path.startsWith("/objects/") && !/^\/objects\/uploads\/[a-f0-9-]{36}$/.test(path)) return false;
    if (!isUploadedImage(path) && !/^product-images\/.+\.(jpg|jpeg|png|webp)$/i.test(path)) return false;
  }
  return true;
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

router.get("/seller/products", requireAuth, async (req, res): Promise<void> => {
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

router.post("/seller/products", requireAuth, async (req, res): Promise<void> => {
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
  if (!(await validImages(parsed.data.frontImage, parsed.data.sideImage, store.id))) {
    res.status(400).json({
      error: "Şəkil yolu düzgün deyil və ya bu mağazaya məxsus deyil.",
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
  queueVtoSync(req.log, product, store.slug);
  res.status(201).json(CreateSellerProductResponse.parse(serializeSellerProduct(product)));
});

router.post("/seller/products/bulk", requireAuth, async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const store = await findApprovedStore(email);
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }
  const raw = req.body as { products?: unknown; skipDuplicates?: boolean };
  if (!Array.isArray(raw.products) || raw.products.length < 1 || raw.products.length > BULK_IMPORT_MAX_ROWS) {
    res.status(400).json({ error: `Toplu import 1–${BULK_IMPORT_MAX_ROWS} məhsul sətri qəbul edir.` });
    return;
  }
  const products = [];
  for (const item of raw.products) {
    const parsed = CreateSellerProductBody.safeParse(item);
    if (!parsed.success) {
      res.status(400).json({ error: "Məhsul sətirlərindən biri düzgün deyil." });
      return;
    }
    products.push(parsed.data);
  }
  const skipDuplicates = raw.skipDuplicates !== false;

  const existing = await db
    .select({ name: sellerProductsTable.name })
    .from(sellerProductsTable)
    .where(eq(sellerProductsTable.sellerId, store.id));
  const existingNames = new Set(existing.map((row) => row.name.trim().toLocaleLowerCase("az")));

  let created = 0;
  let skipped = 0;
  const failed: BulkImportFailure[] = [];

  for (let index = 0; index < products.length; index += 1) {
    const rowNumber = index + 1;
    const item = products[index];
    const key = item.name.trim().toLocaleLowerCase("az");
    if (skipDuplicates && existingNames.has(key)) {
      skipped += 1;
      continue;
    }
    if (!(await validImages(item.frontImage, item.sideImage, store.id))) {
      failed.push({
        row: rowNumber,
        name: item.name,
        error: "Şəkil yolu düzgün deyil və ya bu mağazaya məxsus deyil.",
      });
      continue;
    }

    try {
      const [product] = await db
        .insert(sellerProductsTable)
        .values({
          id: randomUUID(),
          sellerId: store.id,
          ...item,
          approvalStatus: "pending",
          moderationNote: null,
        })
        .returning();
      existingNames.add(key);
      created += 1;
      queueVtoSync(req.log, product, store.slug);
    } catch (error) {
      req.log.warn({ err: error, row: rowNumber, name: item.name }, "Bulk product insert failed");
      failed.push({ row: rowNumber, name: item.name, error: "Məhsul bazaya yazılmadı." });
    }
  }

  req.log.info(
    { sellerId: store.id, created, skipped, failed: failed.length },
    "Seller bulk product import finished",
  );
  res.status(201).json({ created, skipped, failed });
});

router.patch("/seller/products/:id", requireAuth, async (req, res): Promise<void> => {
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
  const [existing] = await db.select().from(sellerProductsTable)
    .where(and(eq(sellerProductsTable.id, params.data.id), eq(sellerProductsTable.sellerId, store.id)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Məhsul tapılmadı." });
    return;
  }
  if (!(await validImages(parsed.data.frontImage, parsed.data.sideImage, store.id, existing))) {
    res.status(400).json({
      error: "Şəkil yolu düzgün deyil və ya bu mağazaya məxsus deyil.",
    });
    return;
  }

  const current = existing as Record<string, unknown>;
  const publicContentChanged = Object.entries(parsed.data).some(
    ([key, value]) => key !== "stock" && key !== "status" && value !== current[key],
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
  await cleanupReplacedImages(
    [existing.frontImage, existing.sideImage], [product.frontImage, product.sideImage], store.id,
  );
  const vtoFieldsChanged = ["frontImage", "sideImage", "name", "size"].some(
    (key) => key in parsed.data && parsed.data[key as keyof typeof parsed.data] !== existing[key as keyof typeof existing],
  );
  if (vtoFieldsChanged) queueVtoSync(req.log, product, store.slug);
  res.json(UpdateSellerProductResponse.parse(serializeSellerProduct(product)));
});

router.delete("/seller/products/:id", requireAuth, async (req, res): Promise<void> => {
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
    .returning({ id: sellerProductsTable.id, frontImage: sellerProductsTable.frontImage, sideImage: sellerProductsTable.sideImage });
  if (!product) {
    res.status(404).json({ error: "Məhsul tapılmadı." });
    return;
  }
  req.log.info({ productId: product.id }, "Seller product deleted");
  await cleanupReplacedImages([product.frontImage, product.sideImage], [], store.id);
  void deleteSellerProductFromVto(product.id);
  res.sendStatus(204);
});

router.get("/admin/products", requireAuth, async (req, res): Promise<void> => {
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

router.patch("/admin/products/:id/approval", requireAuth, async (req, res): Promise<void> => {
  if (!requireMarketplaceAdmin(req, res)) return;
  const params = ReviewSellerProductParams.safeParse(req.params);
  const body = ReviewSellerProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Məhsul moderasiyası düzgün deyil." });
    return;
  }
  const [product] = await db
    .update(sellerProductsTable)
    .set({
      approvalStatus: body.data.approvalStatus,
      moderationNote: body.data.moderationNote ?? null,
      ...(body.data.approvalStatus === "approved" ? { status: "Aktiv" } : {}),
      updatedAt: new Date(),
    })
    .where(eq(sellerProductsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Məhsul tapılmadı." });
    return;
  }
  if (body.data.approvalStatus === "approved") {
    const [store] = await db.select().from(sellerStoresTable).where(eq(sellerStoresTable.id, product.sellerId)).limit(1);
    if (store) queueVtoSync(req.log, product, store.slug);
  }
  res.json(ReviewSellerProductResponse.parse(serializeSellerProduct(product)));
});

export default router;