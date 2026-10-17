import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, sellerProductsTable, sellerStoresTable } from "@workspace/db";
import { logger } from "./logger";

type SeedFile = {
  sellerId: string;
  products: Array<{
    name: string;
    category: string;
    price: number;
    stock: number;
    color: string;
    material: string;
    brand: string;
    gender: string;
    shape: string;
    size: string;
    description: string;
    status: string;
    front_image: string;
    side_image: string;
  }>;
};

function loadSeed(): SeedFile {
  const file = path.join(__dirname, "..", "data", "horizon-catalog-seed.json");
  return JSON.parse(readFileSync(file, "utf-8")) as SeedFile;
}

/** Idempotent: inserts Horizon Excel catalog when store exists and names are new. */
export async function seedHorizonCatalogIfEnabled(): Promise<void> {
  if (process.env.HORIZON_AUTO_SEED !== "true") return;

  const seed = loadSeed();
  const [store] = await db
    .select()
    .from(sellerStoresTable)
    .where(eq(sellerStoresTable.id, seed.sellerId))
    .limit(1);
  if (!store) {
    logger.warn({ sellerId: seed.sellerId }, "Horizon seed skipped: store id not found");
    return;
  }

  let inserted = 0;
  let skipped = 0;
  for (const row of seed.products) {
    const [existing] = await db
      .select({ id: sellerProductsTable.id })
      .from(sellerProductsTable)
      .where(and(eq(sellerProductsTable.sellerId, store.id), eq(sellerProductsTable.name, row.name)))
      .limit(1);
    if (existing) {
      skipped += 1;
      continue;
    }
    await db.insert(sellerProductsTable).values({
      id: randomUUID(),
      sellerId: store.id,
      name: row.name,
      category: row.category,
      price: row.price,
      stock: row.stock,
      color: row.color,
      material: row.material,
      brand: row.brand,
      gender: row.gender,
      shape: row.shape,
      size: row.size,
      description: row.description,
      status: row.status,
      approvalStatus: "approved",
      moderationNote: null,
      frontImage: row.front_image,
      sideImage: row.side_image,
    });
    inserted += 1;
  }

  logger.info({ inserted, skipped, sellerId: store.id }, "Horizon catalog seed finished");
}
