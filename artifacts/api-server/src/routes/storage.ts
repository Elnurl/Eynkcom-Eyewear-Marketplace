import { and, eq } from "drizzle-orm";
import { db, productImageUploadsTable, sellerStoresTable } from "@workspace/db";
import {
  CompleteUploadBody,
  CompleteUploadResponse,
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { isPublishedImage, removeUnusedImage } from "../lib/productImages";
import { requireUserEmail } from "./access";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
const storage = new ObjectStorageService();

async function approvedStore(req: Request, res: Response) {
  const email = requireUserEmail(req, res);
  if (!email) return null;
  const [store] = await db.select().from(sellerStoresTable)
    .where(and(eq(sellerStoresTable.ownerEmail, email), eq(sellerStoresTable.status, "active")))
    .limit(1);
  if (!store) res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
  return store ?? null;
}

router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const store = await approvedStore(req, res);
    if (!store) return;

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Şəkil metadata-sı düzgün deyil." });
      return;
    }

    try {
      const { uploadURL, objectPath } = await storage.createUpload(parsed.data.contentType);
      await db.insert(productImageUploadsTable).values({
        objectPath,
        sellerId: store.id,
        ownerId: req.dbUser!.id,
        contentType: parsed.data.contentType,
        size: parsed.data.size,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: parsed.data,
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Failed to generate product image upload URL");
      res.status(500).json({ error: "Şəkil yükləmə ünvanı yaradıla bilmədi." });
    }
  },
);

router.post(
  "/storage/uploads/complete",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const store = await approvedStore(req, res);
    if (!store) return;

    const parsed = CompleteUploadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Obyekt yolu düzgün deyil." });
      return;
    }

    try {
      // The ticket binds the object to this shop and account; a caller cannot
      // finalize an upload issued to someone else.
      const [ticket] = await db.select().from(productImageUploadsTable)
        .where(and(
          eq(productImageUploadsTable.objectPath, parsed.data.objectPath),
          eq(productImageUploadsTable.sellerId, store.id),
          eq(productImageUploadsTable.ownerId, req.dbUser!.id),
        )).limit(1);
      if (!ticket || ticket.expiresAt < new Date()) {
        res.status(403).json({ error: "Yükləmə icazəsi tapılmadı və ya vaxtı bitib." });
        return;
      }
      const object = await storage.stat(ticket.objectPath);
      if (object.size !== ticket.size || object.contentType !== ticket.contentType) {
        res.status(400).json({ error: "Yüklənmiş şəklin formatı və ya ölçüsü uyğun deyil." });
        return;
      }
      const header = await storage.readHeader(ticket.objectPath, 8);
      const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      const isPng = header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if (!(ticket.contentType === "image/jpeg" ? isJpeg : isPng)) {
        res.status(400).json({ error: "Fayl JPG və ya PNG şəkli deyil." });
        return;
      }
      await db.update(productImageUploadsTable).set({ finalizedAt: new Date() })
        .where(eq(productImageUploadsTable.objectPath, ticket.objectPath));
      req.log.info({ objectPath: ticket.objectPath, owner: req.dbUser!.id }, "Product image upload finalized");
      res.json(CompleteUploadResponse.parse({ objectPath: ticket.objectPath }));
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(400).json({ error: "Şəkil storage-ə yüklənməyib." });
        return;
      }
      req.log.error({ err: error }, "Failed to finalize product image upload");
      res.status(500).json({ error: "Şəkil yükləməsi tamamlana bilmədi." });
    }
  },
);

router.post("/storage/uploads/discard", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const store = await approvedStore(req, res);
  if (!store) return;
  const parsed = CompleteUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Obyekt yolu düzgün deyil." });
    return;
  }
  const [ticket] = await db.select().from(productImageUploadsTable)
    .where(and(
      eq(productImageUploadsTable.objectPath, parsed.data.objectPath),
      eq(productImageUploadsTable.sellerId, store.id),
      eq(productImageUploadsTable.ownerId, req.dbUser!.id),
    )).limit(1);
  if (!ticket) {
    res.status(403).json({ error: "Bu şəkil sizə məxsus deyil." });
    return;
  }
  try {
    await removeUnusedImage(ticket.objectPath, store.id);
    res.sendStatus(204);
  } catch (error) {
    req.log.error({ err: error }, "Failed to discard product image");
    res.status(500).json({ error: "Şəkil silinə bilmədi." });
  }
});

router.get(
  "/storage/objects/*path",
  async (req: Request, res: Response): Promise<void> => {
    const raw = req.params.path;
    const objectPath = `/objects/${Array.isArray(raw) ? raw.join("/") : raw}`;
    if (!(await isPublishedImage(objectPath))) {
      res.sendStatus(404);
      return;
    }
    try {
      const object = await storage.open(objectPath);
      res.setHeader("Content-Type", object.contentType);
      if (object.contentLength !== undefined) res.setHeader("Content-Length", String(object.contentLength));
      // Object keys are random UUIDs and never rewritten, so they can be cached for long.
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      object.body.on("error", () => res.destroy());
      object.body.pipe(res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Şəkil tapılmadı." });
        return;
      }
      throw error;
    }
  },
);

export default router;
