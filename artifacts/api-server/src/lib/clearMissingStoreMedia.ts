import { eq } from "drizzle-orm";
import { db, sellerStoresTable, type StoreVitrineTheme } from "@workspace/db";
import { ObjectNotFoundError, ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";

const storage = new ObjectStorageService();

async function objectExists(path: string | null | undefined): Promise<boolean> {
  if (!path || !path.startsWith("/objects/")) return Boolean(path);
  try {
    await storage.stat(path);
    return true;
  } catch (error) {
    if (error instanceof ObjectNotFoundError) return false;
    throw error;
  }
}

/**
 * Drop logo/hero paths whose bytes disappeared (ephemeral disk / missing S3).
 * Keeps the vitrine from requesting broken hero media on every page load.
 */
export async function clearMissingStoreMedia(): Promise<void> {
  const stores = await db.select().from(sellerStoresTable);
  let cleared = 0;
  for (const store of stores) {
    const theme: StoreVitrineTheme | null = store.vitrineTheme ?? null;
    const heroPath = theme?.heroMediaPath ?? null;
    const logoMissing = store.logoPath ? !(await objectExists(store.logoPath)) : false;
    const heroMissing = heroPath ? !(await objectExists(heroPath)) : false;
    if (!logoMissing && !heroMissing) continue;

    const nextTheme: StoreVitrineTheme | null = theme
      ? { ...theme, ...(heroMissing ? { heroMediaPath: null } : {}) }
      : null;
    await db
      .update(sellerStoresTable)
      .set({
        ...(logoMissing ? { logoPath: null } : {}),
        ...(heroMissing ? { vitrineTheme: nextTheme } : {}),
        updatedAt: new Date(),
      })
      .where(eq(sellerStoresTable.id, store.id));
    cleared += 1;
    logger.warn(
      { storeId: store.id, logoMissing, heroMissing },
      "Cleared missing store logo/hero media paths",
    );
  }
  if (cleared) logger.info({ cleared }, "Store media cleanup finished");
}
