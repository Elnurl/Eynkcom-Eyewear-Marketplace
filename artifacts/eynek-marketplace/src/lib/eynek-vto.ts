export const EYNEK_VTO_STORE = (import.meta.env.VITE_EYNEK_VTO_STORE as string | undefined) || 'eynek-store';

type VtoApi = {
  open: (opts: Record<string, unknown>) => void;
  isAvailable: (sku: string, store?: string) => Promise<boolean>;
  products: (store?: string) => Promise<Array<{ sku: string }>>;
  origin: string;
};

function api(): VtoApi | null {
  return (window as Window & { EynekVTO?: VtoApi }).EynekVTO ?? null;
}

export type VtoProductInput = {
  id: number | string;
  name: string;
  price: number;
  vendor: string;
  image: string;
  type?: string;
  isAvailable: boolean;
  previewOnly?: boolean;
};

export function absoluteAssetUrl(path: string, resolve: (p: string) => string) {
  const src = resolve(path);
  if (/^https?:\/\//.test(src) || src.startsWith('data:')) return src;
  return new URL(src, window.location.origin).href;
}

export function toVtoProduct(product: VtoProductInput, resolve: (p: string) => string) {
  return {
    sku: String(product.id),
    name: product.name,
    price: product.price,
    currency: 'AZN',
    vendor: product.vendor,
    image: absoluteAssetUrl(product.image, resolve),
    available: !product.previewOnly && product.isAvailable,
  };
}

export function openEynekTryOn(opts: {
  product?: VtoProductInput | null;
  catalog?: VtoProductInput[];
  resolveImage: (path: string) => string;
  onAddToCart?: (sku: string) => void;
  onViewCart?: () => void;
}) {
  const vto = api();
  if (!vto) return;
  const sku = opts.product ? String(opts.product.id) : '';
  const pool = (opts.catalog || []).filter((item) => !item.previewOnly);
  const related = opts.product ? pool.filter((item) => !item.type || item.type === opts.product?.type) : pool;
  const products = (opts.product ? [opts.product, ...related.filter((item) => String(item.id) !== sku)] : related)
    .slice(0, 12)
    .map((item) => toVtoProduct(item, opts.resolveImage));
  vto.open({
    store: EYNEK_VTO_STORE,
    sku,
    lang: document.documentElement.lang || 'az',
    product: opts.product ? toVtoProduct(opts.product, opts.resolveImage) : undefined,
    products,
    onAddToCart: ({ sku: added }: { sku?: string }) => {
      if (added) opts.onAddToCart?.(added);
    },
    onViewCart: () => opts.onViewCart?.(),
    termsUrl: '/mexfilik',
  });
}

export async function fetchVtoSkus(): Promise<Set<string>> {
  const vto = api();
  if (vto) {
    try {
      const list = await vto.products(EYNEK_VTO_STORE);
      return new Set((list || []).map((item) => String(item.sku)));
    } catch {
      /* fall through */
    }
  }
  try {
    const origin = vto?.origin || (import.meta.env.VITE_EYNEK_VTO_ORIGIN as string | undefined) || 'https://tryon-wa.onrender.com';
    const res = await fetch(`${origin}/v1/stores/${encodeURIComponent(EYNEK_VTO_STORE)}/products`);
    if (!res.ok) return new Set();
    const data = (await res.json()) as { products?: Array<{ sku: string }> };
    return new Set((data.products || []).map((item) => String(item.sku)));
  } catch {
    return new Set();
  }
}

export function waitForEynekVto(timeoutMs = 8000): Promise<boolean> {
  if (api()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      if (api() || Date.now() - started > timeoutMs) {
        window.clearInterval(tick);
        resolve(Boolean(api()));
      }
    }, 200);
  });
}
