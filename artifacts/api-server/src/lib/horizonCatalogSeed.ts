import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
  const name = "horizon-catalog-seed.json";
  // Bundled prod: build.mjs copies src/data → dist/data (__dirname === dist).
  // Local tsx: module lives under src/lib → ../data.
  const candidates = [
    path.join(__dirname, "data", name),
    path.join(__dirname, "..", "data", name),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) {
    throw new Error(`Horizon seed file not found (checked: ${candidates.join(", ")})`);
  }
  return JSON.parse(readFileSync(file, "utf-8")) as SeedFile;
}

/** Idempotent: inserts Horizon Excel catalog when store exists and names are new. */
export async function seedHorizonCatalogIfEnabled(): Promise<void> {
  if (process.env.HORIZON_AUTO_SEED !== "true") return;

  let seed: SeedFile;
  try {
    seed = loadSeed();
  } catch (err) {
    logger.error({ err }, "Horizon catalog seed file could not be loaded");
    return;
  }
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
