import { Readable } from "node:stream";
import path from "node:path";
import { promises as fs } from "node:fs";
import { ObjectNotFoundError, ObjectStorageService } from "./objectStorage";

const STORE = process.env.VTO_STORE?.trim() || "eynek-store";

function vtoOrigin() {
  return (process.env.VTO_URL || process.env.EYNEK_VTO_URL || "https://tryon-wa.onrender.com").replace(/\/$/, "");
}

function apiKey() {
  return process.env.VTO_API_KEY?.trim() || "";
}

async function streamToBuffer(body: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function readSampleImage(rel: string): Promise<Buffer | null> {
  const candidates = [
    path.join(process.cwd(), "artifacts/eynek-marketplace/dist", rel),
    path.join(process.cwd(), "artifacts/eynek-marketplace/public", rel),
    path.join(process.cwd(), "public", rel),
  ];
  for (const file of candidates) {
    try {
      return await fs.readFile(file);
    } catch {
      /* try next */
    }
  }
  return null;
}

async function readImage(imagePath: string): Promise<Buffer | null> {
  if (!imagePath) return null;
  if (imagePath.startsWith("/objects/")) {
    try {
      const stored = await new ObjectStorageService().open(imagePath);
      return streamToBuffer(stored.body);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return null;
      throw error;
    }
  }
  if (/^product-images\/[a-z0-9-]+\.jpg$/.test(imagePath)) return readSampleImage(imagePath);
  return null;
}

export type VtoSyncInput = {
  id: string;
  name: string;
  size?: string;
  frontImage: string;
  sideImage: string;
  seller?: string;
};

export async function syncSellerProductToVto(product: VtoSyncInput): Promise<{ ok: boolean; error?: string }> {
  const key = apiKey();
  if (!key) return { ok: false, error: "VTO_API_KEY yoxdur" };
  const front = await readImage(product.frontImage);
  if (!front) return { ok: false, error: "Ön şəkil oxunmadı" };
  const side = await readImage(product.sideImage);
  const body = new FormData();
  body.set("sku", product.id);
  body.set("name", product.name);
  if (product.size) body.set("sizes", product.size);
  body.set("front", new File([new Uint8Array(front)], "front.jpg", { type: "image/jpeg" }));
  if (side) {
    body.set("left", new File([new Uint8Array(side)], "left.jpg", { type: "image/jpeg" }));
    body.set("right", new File([new Uint8Array(side)], "right.jpg", { type: "image/jpeg" }));
  }
  const res = await fetch(`${vtoOrigin()}/v1/products`, {
    method: "POST",
    headers: { "X-Api-Key": key },
    body,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({})) as { detail?: string };
    return { ok: false, error: detail.detail || `VTO ${res.status}` };
  }
  return { ok: true };
}

export async function deleteSellerProductFromVto(sku: string): Promise<void> {
  const key = apiKey();
  if (!key) return;
  await fetch(`${vtoOrigin()}/v1/products/${encodeURIComponent(sku)}`, {
    method: "DELETE",
    headers: { "X-Api-Key": key },
  }).catch(() => undefined);
}

export function vtoConfigured() {
  return Boolean(apiKey());
}

export { STORE as VTO_STORE };
