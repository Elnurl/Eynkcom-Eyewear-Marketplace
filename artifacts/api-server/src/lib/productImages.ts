import { and, eq, isNotNull, or } from "drizzle-orm";
import { db, productImageUploadsTable, sellerProductsTable } from "@workspace/db";
import { ObjectNotFoundError, ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";

const storage = new ObjectStorageService();
export const isUploadedImage = (path: string) => path.startsWith("/objects/");
export const UPLOADED_IMAGE_PATH = /^\/objects\/uploads\/[a-f0-9-]{36}$/;

export async function imageBelongsToSeller(path: string, sellerId: string): Promise<boolean> {
  if (!UPLOADED_IMAGE_PATH.test(path)) return false;
  const [ticket] = await db.select().from(productImageUploadsTable)
    .where(and(eq(productImageUploadsTable.objectPath, path), eq(productImageUploadsTable.sellerId, sellerId)))
    .limit(1);
  if (!ticket?.finalizedAt) return false;
  try {
    await storage.stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Only finalized uploads are publicly readable. */
export async function isPublishedImage(path: string): Promise<boolean> {
  if (!UPLOADED_IMAGE_PATH.test(path)) return false;
  const [ticket] = await db.select({ objectPath: productImageUploadsTable.objectPath })
    .from(productImageUploadsTable)
    .where(and(eq(productImageUploadsTable.objectPath, path), isNotNull(productImageUploadsTable.finalizedAt)))
    .limit(1);
  return Boolean(ticket);
}

export async function removeUnusedImage(path: string, sellerId: string): Promise<void> {
  if (!isUploadedImage(path)) return;
  const [ticket] = await db.select().from(productImageUploadsTable)
    .where(and(eq(productImageUploadsTable.objectPath, path), eq(productImageUploadsTable.sellerId, sellerId)))
    .limit(1);
  if (!ticket) return; // Never delete sample images or objects not tracked by this shop.
  const [reference] = await db.select({ id: sellerProductsTable.id }).from(sellerProductsTable)
    .where(or(eq(sellerProductsTable.frontImage, path), eq(sellerProductsTable.sideImage, path)))
    .limit(1);
  if (reference) return;
  try {
    try {
      await storage.delete(path);
    } catch (error) {
      if (!(error instanceof ObjectNotFoundError)) throw error;
    }
    await db.delete(productImageUploadsTable)
      .where(and(eq(productImageUploadsTable.objectPath, path), eq(productImageUploadsTable.sellerId, sellerId)));
  } catch (error) {
    // Keep the ticket for a later retry, rather than losing track of the object.
    logger.error({ err: error, objectPath: path }, "Could not remove unused product image");
    throw error;
  }
}

export async function cleanupReplacedImages(
  oldImages: string[],
  newImages: string[],
  sellerId: string,
): Promise<void> {
  for (const path of new Set(oldImages.filter(path => !newImages.includes(path)))) {
    try {
      await removeUnusedImage(path, sellerId);
    } catch {
      // Product changes already persisted. A failed storage deletion must not
      // cause the client to repeat the mutation and accidentally duplicate it.
    }
  }
}
