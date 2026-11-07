import { useMemo, useState, type CSSProperties } from 'react';
import { Check, Copy, Link2, MapPin, ScanFace, ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'wouter';
import type { VitrineTheme } from '@workspace/api-client-react';
import { BrandWord } from '@/components/brand-logo';
import { VendorMark } from '@/components/marketplace/VendorMark';
import { MarketProductCard, type MarketProduct } from '@/components/marketplace/MarketProductCard';
import { fontCss, normalizeVitrineTheme } from '@/lib/vitrine-theme';

/** Short Instagram-friendly aliases → real store slug on eynek.store */
export const VITRINE_ALIASES: Record<string, string> = {
  horizon: 'horizon-optic-3f209b',
  'horizon-optic': 'horizon-optic-3f209b',
  'horizon-optik': 'horizon-optic-3f209b',
};

export type VitrineVendor = {
  slug: string;
  name: string;
  initials: string;
  location: string;
  since: string;
  description: string;
  logoPath?: string | null;
  count: number;
  instagram?: string;
  website?: string;
  vitrineTheme?: VitrineTheme | null;
};

type VitrineProduct = MarketProduct & {
  price: number;
  color: string;
  previewOnly?: boolean;
  isAvailable: boolean;
  vtoReady?: boolean;
};

function resolveSlug(raw: string, stores: VitrineVendor[]) {
  const key = raw.trim().toLowerCase();
  if (!key) return '';
  const aliased = VITRINE_ALIASES[key];
  if (aliased) return aliased;
  if (stores.some((s) => s.slug === raw)) return raw;
  const byName = stores.find((s) => s.slug === key || s.name.toLocaleLowerCase('az').replace(/\s+/g, '-') === key);
  return byName?.slug ?? raw;
}

function money(value: number) {
  return `${value.toLocaleString('az-AZ')} AZN`;
}

function frameSwatch(color: string) {
  const known: Record<string, string> = {
    Qara: '#1c1c1c',
    Gümüş: '#c5c8ce',
    Kəhrəba: '#d28a3a',
    Qızılı: '#c4a15a',
    Şaftalı: '#e4b39a',
    Zeytun: '#6d7348',
    Qrafit: '#5e636a',
    Tısbağa: '#8b5a34',
  };
  return known[color] ?? '#1c1c1c';
}

function productHoverImage(product: VitrineProduct) {
  if (product.wornImage) return { src: product.wornImage, kind: 'worn' as const };
  if (product.sideImage) return { src: product.sideImage, kind: 'side' as const };
  return null;
}

function instagramHref(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, '');
  return `https://instagram.com/${handle}`;
}

export function VitrinePage({
  products,
  stores,
  likedIds,
  onFavorite,
  onTryOn,
  onAdd,
  photoSrc,
}: {
  products: VitrineProduct[];
  stores: VitrineVendor[];
  likedIds: Set<number | string>;
  onFavorite: (id: number | string) => void;
  onTryOn: (product: VitrineProduct) => void;
  onAdd: (product: VitrineProduct) => void;
  photoSrc: (path: string) => string;
}) {
  const { slug: rawSlug = '' } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);
  const resolved = resolveSlug(rawSlug, stores);
  const vendor = stores.find((item) => item.slug === resolved);
  const items = useMemo(
    () => products.filter((product) => product.vendorSlug === resolved && !product.previewOnly),
    [products, resolved],
  );
  const theme = normalizeVitrineTheme(vendor?.vitrineTheme);
  const sharePath = vendor ? `/v/${VITRINE_ALIASES[rawSlug.toLowerCase()] ? rawSlug.toLowerCase() : preferredAlias(vendor.slug)}` : `/v/${rawSlug}`;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath;
  const ig = instagramHref(vendor?.instagram);
  const heroUrl = theme.heroMediaPath ? photoSrc(theme.heroMediaPath) : '';
  const pageStyle = {
    '--vt-bg': theme.bgColor,
    '--vt-card': theme.cardColor,
    '--vt-text': theme.textColor,
    '--vt-accent': theme.accentColor,
    '--vt-font': fontCss(theme.fontFamily),
    '--vt-overlay': String(theme.heroOverlay),
    ...(heroUrl ? { '--vt-hero': `url("${heroUrl.replace(/"/g, '%22')}")` } : {}),
  } as CSSProperties;

  if (!vendor) {
    return (
      <main className="vitrine-page">
        <div className="vitrine-empty">
          <h1>Vitrin tapılmadı</h1>
          <p>Bu linkə uyğun mağaza yoxdur. eynek.store-da mağazalar siyahısına baxın.</p>
          <Link href="/stores" className="btn btn-secondary">
            Mağazalara bax
          </Link>
        </div>
      </main>
    );
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <main className={`vitrine-page${heroUrl ? ' has-hero-media' : ''}`} data-testid="page-vitrine" style={pageStyle}>
      <header className="vitrine-top">
        <Link href="/" className="vitrine-eynek" aria-label="EYNƏK ana səhifə">
          <BrandWord />
        </Link>
        <button type="button" className="vitrine-share" onClick={copyLink} data-testid="button-copy-vitrine-link">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Kopyalandı' : 'Linki kopyala'}
        </button>
      </header>

      <section className="vitrine-hero">
        {heroUrl ? <div className="vitrine-hero-media" aria-hidden /> : null}
        <VendorMark vendor={vendor} variant="detail" />
        <div className="vitrine-hero-copy">
          <p className="vitrine-eyebrow">Virtual vitrin</p>
          <h1>{vendor.name}</h1>
          {vendor.description ? <p className="vitrine-desc">{vendor.description}</p> : <p className="vitrine-desc">Eynəkləri seçin, üzünüzdə yoxlayın və sifariş edin.</p>}
          <div className="vitrine-meta">
            <span>
              <MapPin size={14} /> {vendor.location || 'Bakı'}
            </span>
            <span>
              <ShoppingBag size={14} /> {items.length} model
            </span>
            {ig ? (
              <a href={ig} target="_blank" rel="noopener noreferrer" className="vitrine-ig">
                Instagram
              </a>
            ) : null}
          </div>
          <p className="vitrine-link-hint">
            <Link2 size={14} /> {shareUrl.replace(/^https?:\/\//, '')}
          </p>
        </div>
      </section>

      <section className="vitrine-grid-wrap">
        <div className="vitrine-section-head">
          <div>
            <p className="vitrine-eyebrow">Kolleksiya</p>
            <h2>Bu vitrində</h2>
          </div>
          <p className="vitrine-hint">
            <ScanFace size={15} /> Üzündə yoxla düyməsi ilə virtual sınaq
          </p>
        </div>
        {items.length ? (
          <div className="product-grid vitrine-grid">
            {items.map((product) => (
              <MarketProductCard
                key={product.id}
                product={product}
                liked={likedIds.has(product.id) || likedIds.has(String(product.id))}
                onFavorite={onFavorite}
                onTryOn={onTryOn}
                onAdd={onAdd}
                photoSrc={photoSrc}
                hover={productHoverImage(product)}
                swatchColor={frameSwatch(product.color)}
                formatPrice={money}
              />
            ))}
          </div>
        ) : (
          <div className="vitrine-empty">
            <h3>Hələ məhsul yoxdur</h3>
            <p>Mağaza məhsulları təsdiqlənəndə burada görünəcək.</p>
          </div>
        )}
      </section>

      <footer className="vitrine-footer">
        <span>
          Bu vitrin <BrandWord /> üzərində işləyir
        </span>
        <Link href="/stores">Bütün mağazalar</Link>
      </footer>
    </main>
  );
}

function preferredAlias(slug: string) {
  const entry = Object.entries(VITRINE_ALIASES).find(([, target]) => target === slug);
  return entry?.[0] ?? slug;
}

export function vitrinePublicPath(storeSlug: string) {
  return `/v/${preferredAlias(storeSlug)}`;
}
