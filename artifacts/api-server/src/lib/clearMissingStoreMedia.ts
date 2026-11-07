import { eq } from "drizzle-orm";
import { db, sellerStoresTable, type StoreVitrineTheme } from "@workspace/db";
import { ObjectNotFoundError, ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";

const storage = new ObjectStorageService();

const MAX_HERO_BYTES = 900 * 1024;

async function objectStats(path: string | null | undefined): Promise<{ ok: boolean; size: number }> {
  if (!path || !path.startsWith("/objects/")) return { ok: Boolean(path), size: 0 };
  try {
    const stats = await storage.stat(path);
    return { ok: true, size: stats.size };
  } catch (error) {
    if (error instanceof ObjectNotFoundError) return { ok: false, size: 0 };
    throw error;
  }
}

/**
 * Drop logo/hero paths whose bytes disappeared (ephemeral disk / missing S3),
 * and drop oversized hero GIFs that stall the public vitrine.
 */
export async function clearMissingStoreMedia(): Promise<void> {
  const stores = await db.select().from(sellerStoresTable);
  let cleared = 0;
  for (const store of stores) {
    const theme: StoreVitrineTheme | null = store.vitrineTheme ?? null;
    const heroPath = theme?.heroMediaPath ?? null;
    const logoStats = store.logoPath ? await objectStats(store.logoPath) : { ok: true, size: 0 };
    const heroStats = heroPath ? await objectStats(heroPath) : { ok: true, size: 0 };
    const logoMissing = Boolean(store.logoPath) && !logoStats.ok;
    const heroMissing = Boolean(heroPath) && !heroStats.ok;
    const heroTooLarge = Boolean(heroPath) && heroStats.ok && heroStats.size > MAX_HERO_BYTES;
    if (!logoMissing && !heroMissing && !heroTooLarge) continue;

    const dropHero = heroMissing || heroTooLarge;
    const nextTheme: StoreVitrineTheme | null = theme
      ? { ...theme, ...(dropHero ? { heroMediaPath: null } : {}) }
      : null;
    await db
      .update(sellerStoresTable)
      .set({
        ...(logoMissing ? { logoPath: null } : {}),
        ...(dropHero ? { vitrineTheme: nextTheme } : {}),
        updatedAt: new Date(),
      })
      .where(eq(sellerStoresTable.id, store.id));
    cleared += 1;
    logger.warn(
      { storeId: store.id, logoMissing, heroMissing, heroTooLarge, heroBytes: heroStats.size },
      "Cleared broken or oversized store logo/hero media paths",
    );
  }
  if (cleared) logger.info({ cleared }, "Store media cleanup finished");
}
