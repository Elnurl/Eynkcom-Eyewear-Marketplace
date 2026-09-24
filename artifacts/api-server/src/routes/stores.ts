import { Router, type IRouter } from "express";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  GetSellerStoreResponse,
  ListStoresResponse,
  UpdateSellerStoreBody,
  UpdateSellerStoreResponse,
} from "@workspace/api-zod";
import { db, sellerProductsTable, sellerStoresTable } from "@workspace/db";
import { requireUserEmail } from "./access";

const router: IRouter = Router();

function formatStore(
  store: typeof sellerStoresTable.$inferSelect,
  productCount: number,
) {
  const words = store.name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("az");
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    location: store.location,
    description: store.description,
    instagram: store.instagram,
    website: store.website,
    status: store.status,
    productCount,
    initials: initials || "S",
    since: `${store.createdAt.getFullYear()}-dən`,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}

async function getPublicProductCounts(storeIds: string[]): Promise<Map<string, number>> {
  if (storeIds.length === 0) return new Map();
  const counts = await db
    .select({ sellerId: sellerProductsTable.sellerId, productCount: count() })
    .from(sellerProductsTable)
    .where(
      and(
        inArray(sellerProductsTable.sellerId, storeIds),
        eq(sellerProductsTable.status, "Aktiv"),
        eq(sellerProductsTable.approvalStatus, "approved"),
      ),
    )
    .groupBy(sellerProductsTable.sellerId);
  return new Map(counts.map((row) => [row.sellerId, row.productCount]));
}

router.get("/stores", async (req, res): Promise<void> => {
  const stores = await db
    .select()
    .from(sellerStoresTable)
    .where(eq(sellerStoresTable.status, "active"))
    .orderBy(desc(sellerStoresTable.createdAt));
  const counts = await getPublicProductCounts(stores.map((store) => store.id));
  res.json(ListStoresResponse.parse(stores.map((store) => formatStore(store, counts.get(store.id) ?? 0))));
});

router.get("/seller/store", async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;

  const [store] = await db
    .select()
    .from(sellerStoresTable)
    .where(and(eq(sellerStoresTable.ownerEmail, email), eq(sellerStoresTable.status, "active")))
    .limit(1);
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }

  const counts = await getPublicProductCounts([store.id]);
  res.json(GetSellerStoreResponse.parse(formatStore(store, counts.get(store.id) ?? 0)));
});

router.patch("/seller/store", async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const parsed = UpdateSellerStoreBody.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Mağaza məlumatları düzgün deyil." });
    return;
  }

  const [store] = await db
    .update(sellerStoresTable)
    .set(parsed.data)
    .where(and(eq(sellerStoresTable.ownerEmail, email), eq(sellerStoresTable.status, "active")))
    .returning();
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }
  const counts = await getPublicProductCounts([store.id]);
  res.json(UpdateSellerStoreResponse.parse(formatStore(store, counts.get(store.id) ?? 0)));
});

export default router;