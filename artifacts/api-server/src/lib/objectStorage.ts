import { randomUUID } from "node:crypto";
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

function keyFor(objectPath: string): string {
  const match = OBJECT_PATH.exec(objectPath);
  if (!match) throw new ObjectNotFoundError();
  return match[1];
}

function isMissing(error: unknown): boolean {
  return error instanceof S3ServiceException
    && (error.name === "NotFound" || error.name === "NoSuchKey" || error.$metadata.httpStatusCode === 404);
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

  async stat(objectPath: string): Promise<{ size: number; contentType: string }> {
    try {
      const head = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: keyFor(objectPath) }));
      return { size: Number(head.ContentLength ?? 0), contentType: head.ContentType ?? "" };
    } catch (error) {
      if (isMissing(error)) throw new ObjectNotFoundError();
      throw error;
    }
  }

  async readHeader(objectPath: string, bytes: number): Promise<Buffer> {
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
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: keyFor(objectPath) }));
  }
}
