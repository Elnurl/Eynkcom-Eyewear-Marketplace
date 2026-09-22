import { Readable } from "node:stream";
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

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.post(
  "/storage/uploads/request-url",
  async (req: Request, res: Response): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Şəkil yükləmək üçün giriş edin." });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Şəkil metadata-sı düzgün deyil." });
      return;
    }

    try {
      const uploadURL = await storage.getObjectEntityUploadURL();
      const objectPath = storage.normalizeObjectEntityPath(uploadURL);
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
  async (req: Request, res: Response): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Şəkil yükləmək üçün giriş edin." });
      return;
    }

    const parsed = CompleteUploadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Obyekt yolu düzgün deyil." });
      return;
    }

    try {
      const objectPath = await storage.setObjectEntityAclPolicy(
        parsed.data.objectPath,
        { owner: req.user.id, visibility: "public" },
      );
      req.log.info({ objectPath, owner: req.user.id }, "Product image upload finalized");
      res.json(CompleteUploadResponse.parse({ objectPath }));
    } catch (error) {
      req.log.error({ err: error }, "Failed to finalize product image upload");
      res.status(500).json({ error: "Şəkil yükləməsi tamamlana bilmədi." });
    }
  },
);

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
      const file = await storage.getObjectEntityFile(`/objects/${path}`);
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