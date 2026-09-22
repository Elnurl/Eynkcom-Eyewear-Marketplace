import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { type File, Storage } from "@google-cloud/storage";
import {
  getObjectAclPolicy,
  setObjectAclPolicy,
  type ObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
  }
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const parts = normalized.split("/");
  if (parts.length < 3) throw new Error("Invalid object path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

export class ObjectStorageService {
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) throw new Error("PRIVATE_OBJECT_DIR is not configured");
    return dir;
  }

  getPublicObjectSearchPaths(): string[] {
    return (process.env.PUBLIC_OBJECT_SEARCH_PATHS || "")
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean);
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const fullPath = `${this.getPrivateObjectDir()}/uploads/${randomUUID()}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;
    const rawObjectPath = new URL(rawPath).pathname;
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir += "/";
    if (!rawObjectPath.startsWith(entityDir)) return rawObjectPath;
    return `/objects/${rawObjectPath.slice(entityDir.length)}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const entityId = objectPath.slice("/objects/".length);
    if (!entityId) throw new ObjectNotFoundError();
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir += "/";
    const { bucketName, objectName } = parseObjectPath(`${entityDir}${entityId}`);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const { bucketName, objectName } = parseObjectPath(`${searchPath}/${filePath}`);
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  async setObjectEntityAclPolicy(
    objectPath: string,
    policy: ObjectAclPolicy,
  ): Promise<string> {
    const normalized = this.normalizeObjectEntityPath(objectPath);
    const file = await this.getObjectEntityFile(normalized);
    await setObjectAclPolicy(file, policy);
    return normalized;
  }

  async downloadObject(file: File, cacheTtlSec = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const policy = await getObjectAclPolicy(file);
    const stream = Readable.toWeb(file.createReadStream()) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${policy?.visibility === "public" ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) headers["Content-Length"] = String(metadata.size);
    return new Response(stream, { headers });
  }
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "PUT";
  ttlSec: number;
}): Promise<string> {
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectName,
        method,
        expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`Failed to sign object URL: ${response.status}`);
  const { signed_url: signedUrl } = (await response.json()) as { signed_url: string };
  return signedUrl;
}