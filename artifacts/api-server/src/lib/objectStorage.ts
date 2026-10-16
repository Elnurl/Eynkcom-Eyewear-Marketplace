import { randomUUID } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible storage (Cloudflare R2, AWS S3, Backblaze B2, MinIO).
 * Uploaded objects live under `uploads/<uuid>` and are exposed to the app as
 * `/objects/uploads/<uuid>`. Ownership is tracked in product_image_uploads.
 */

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
  }
}

export interface StoredObject {
  body: Readable;
  contentType: string;
  contentLength?: number;
}

const OBJECT_PATH = /^\/objects\/(uploads\/[a-f0-9-]{36})$/;

let cachedClient: S3Client | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function client(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    region: process.env.S3_REGION?.trim() || "auto",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  return cachedClient;
}

function bucket(): string {
  return requiredEnv("S3_BUCKET");
}

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_ACCESS_KEY_ID?.trim()
    && process.env.S3_SECRET_ACCESS_KEY?.trim()
    && process.env.S3_BUCKET?.trim(),
  );
}

function keyFor(objectPath: string): string {
  const match = OBJECT_PATH.exec(objectPath);
  if (!match) throw new ObjectNotFoundError();
  return match[1];
}

function isMissing(error: unknown): boolean {
  return error instanceof S3ServiceException
    && (error.name === "NotFound" || error.name === "NoSuchKey" || error.$metadata.httpStatusCode === 404);
}

function localRoot(): string {
  return process.env.PRODUCT_UPLOAD_DIR?.trim() || path.join(process.cwd(), ".product-uploads");
}

function localFilePath(objectPath: string): string {
  return path.join(localRoot(), keyFor(objectPath));
}

async function writeLocalUpload(body: Buffer, contentType: string): Promise<{ objectPath: string }> {
  const key = `uploads/${randomUUID()}`;
  const objectPath = `/objects/${key}`;
  const dir = path.join(localRoot(), "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(localFilePath(objectPath), body);
  await fs.writeFile(`${localFilePath(objectPath)}.meta`, contentType, "utf8");
  return { objectPath };
}

async function readLocalMeta(objectPath: string): Promise<string> {
  try {
    return (await fs.readFile(`${localFilePath(objectPath)}.meta`, "utf8")).trim() || "application/octet-stream";
  } catch {
    return "application/octet-stream";
  }
}

export class ObjectStorageService {
  /** Presigned PUT; the browser must send exactly this Content-Type. */
  async createUpload(contentType: string): Promise<{ uploadURL: string; objectPath: string }> {
    const key = `uploads/${randomUUID()}`;
    const uploadURL = await getSignedUrl(
      client(),
      new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
      { expiresIn: 15 * 60 },
    );
    return { uploadURL, objectPath: `/objects/${key}` };
  }

  /** Server-side PUT — avoids browser CORS to the bucket endpoint. */
  async putNewUpload(body: Buffer, contentType: string): Promise<{ objectPath: string }> {
    if (!isObjectStorageConfigured()) return writeLocalUpload(body, contentType);
    const key = `uploads/${randomUUID()}`;
    await client().send(new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      Body: body,
    }));
    return { objectPath: `/objects/${key}` };
  }

  async stat(objectPath: string): Promise<{ size: number; contentType: string }> {
    if (!isObjectStorageConfigured()) {
      try {
        const file = await fs.stat(localFilePath(objectPath));
        return { size: file.size, contentType: await readLocalMeta(objectPath) };
      } catch {
        throw new ObjectNotFoundError();
      }
    }
    try {
      const head = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: keyFor(objectPath) }));
      return { size: Number(head.ContentLength ?? 0), contentType: head.ContentType ?? "" };
    } catch (error) {
      if (isMissing(error)) throw new ObjectNotFoundError();
      throw error;
    }
  }

  async readHeader(objectPath: string, bytes: number): Promise<Buffer> {
    if (!isObjectStorageConfigured()) {
      try {
        const handle = await fs.open(localFilePath(objectPath), "r");
        try {
          const buffer = Buffer.alloc(bytes);
          const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
          return buffer.subarray(0, bytesRead);
        } finally {
          await handle.close();
        }
      } catch {
        throw new ObjectNotFoundError();
      }
    }
    try {
      const object = await client().send(new GetObjectCommand({
        Bucket: bucket(),
        Key: keyFor(objectPath),
        Range: `bytes=0-${bytes - 1}`,
      }));
      const data = await object.Body?.transformToByteArray();
      return Buffer.from(data ?? []);
    } catch (error) {
      if (isMissing(error)) throw new ObjectNotFoundError();
      throw error;
    }
  }

  async open(objectPath: string): Promise<StoredObject> {
    if (!isObjectStorageConfigured()) {
      try {
        const file = await fs.stat(localFilePath(objectPath));
        return {
          body: createReadStream(localFilePath(objectPath)),
          contentType: await readLocalMeta(objectPath),
          contentLength: file.size,
        };
      } catch {
        throw new ObjectNotFoundError();
      }
    }
    try {
      const object = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: keyFor(objectPath) }));
      if (!object.Body) throw new ObjectNotFoundError();
      return {
        body: object.Body as Readable,
        contentType: object.ContentType || "application/octet-stream",
        contentLength: object.ContentLength,
      };
    } catch (error) {
      if (isMissing(error)) throw new ObjectNotFoundError();
      throw error;
    }
  }

  async delete(objectPath: string): Promise<void> {
    if (!isObjectStorageConfigured()) {
      try {
        await fs.unlink(localFilePath(objectPath));
        await fs.unlink(`${localFilePath(objectPath)}.meta`);
      } catch {
        throw new ObjectNotFoundError();
      }
      return;
    }
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: keyFor(objectPath) }));
  }
}
