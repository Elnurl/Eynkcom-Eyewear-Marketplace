import { and, eq, or } from "drizzle-orm";
import { db, productImageUploadsTable, sellerProductsTable } from "@workspace/db";
import { getObjectAclPolicy } from "./objectAcl";
import { ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";

const storage = new ObjectStorageService();
export const isUploadedImage = (path: string) => path.startsWith("/objects/");

export async function imageBelongsToSeller(path: string, sellerId: string): Promise<boolean> {
  if (!/^\/objects\/uploads\/[a-f0-9-]{36}$/.test(path)) return false;
  const [ticket] = await db.select().from(productImageUploadsTable)
    .where(and(eq(productImageUploadsTable.objectPath, path), eq(productImageUploadsTable.sellerId, sellerId)))
    .limit(1);
  if (!ticket?.finalizedAt) return false;
  try {
    const file = await storage.getObjectEntityFile(path);
    const policy = await getObjectAclPolicy(file);
    return policy?.owner === ticket.ownerId && policy.visibility === "public";
  } catch {
    return false;
  }
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
    const file = await storage.getObjectEntityFile(path);
    const policy = await getObjectAclPolicy(file);
    if (policy && policy.owner !== ticket.ownerId) throw new Error("Object owner mismatch");
    if (!policy && ticket.finalizedAt) throw new Error("Missing object owner");
    await file.delete();
    await db.delete(productImageUploadsTable)
      .where(and(eq(productImageUploadsTable.objectPath, path), eq(productImageUploadsTable.sellerId, sellerId)));
  } catch (error) {
    // Keep the ticket for a later retry, rather than deleting an unverified object.
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