import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db, productImageUploadsTable, sellerStoresTable } from "@workspace/db";
import {
  CompleteUploadBody,
  CompleteUploadResponse,
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";
import { getObjectAclPolicy } from "../lib/objectAcl";
import { removeUnusedImage } from "../lib/productImages";
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
      const uploadURL = await storage.getObjectEntityUploadURL();
      const objectPath = storage.normalizeObjectEntityPath(uploadURL);
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
      const file = await storage.getObjectEntityFile(ticket.objectPath);
      const [metadata] = await file.getMetadata();
      if (Number(metadata.size) !== ticket.size || metadata.contentType !== ticket.contentType) {
        res.status(400).json({ error: "Yüklənmiş şəklin formatı və ya ölçüsü uyğun deyil." });
        return;
      }
      const [header] = await file.download({ start: 0, end: 7 });
      const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      const isPng = header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if (!(ticket.contentType === "image/jpeg" ? isJpeg : isPng)) {
        res.status(400).json({ error: "Fayl JPG və ya PNG şəkli deyil." });
        return;
      }
      // A caller must not be able to finalize an object owned by another account.
      const policy = await getObjectAclPolicy(file);
      if (policy && policy.owner !== req.dbUser!.id) {
        res.status(403).json({ error: "Bu şəkil başqa hesaba məxsusdur." });
        return;
      }
      const objectPath = await storage.setObjectEntityAclPolicy(
        ticket.objectPath,
        { owner: req.dbUser!.id, visibility: "public" },
      );
      await db.update(productImageUploadsTable).set({ finalizedAt: new Date() })
        .where(eq(productImageUploadsTable.objectPath, objectPath));
      req.log.info({ objectPath, owner: req.dbUser!.id }, "Product image upload finalized");
      res.json(CompleteUploadResponse.parse({ objectPath }));
    } catch (error) {
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
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response): Promise<void> => {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await storage.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "Fayl tapılmadı." });
      return;
    }
    await streamFile(file, res);
  },
);

router.get(
  "/storage/objects/*path",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const raw = req.params.path;
      const path = Array.isArray(raw) ? raw.join("/") : raw;
      if (!/^uploads\/[a-f0-9-]{36}$/.test(path)) {
        res.sendStatus(404);
        return;
      }
      const file = await storage.getObjectEntityFile(`/objects/${path}`);
      const policy = await getObjectAclPolicy(file);
      if (policy?.visibility !== "public") {
        res.sendStatus(404);
        return;
      }
      await streamFile(file, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Şəkil tapılmadı." });
        return;
      }
      throw error;
    }
  },
);

async function streamFile(
  file: Awaited<ReturnType<ObjectStorageService["getObjectEntityFile"]>>,
  res: Response,
): Promise<void> {
  const response = await storage.downloadObject(file);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
}

export default router;