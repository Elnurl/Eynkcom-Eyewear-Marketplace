import { type FormEvent, type ReactNode, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { signOutAndGo, useAuthSession, useClearQueriesOnUserChange } from '@/lib/auth-client';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Glasses,
  Heart,
  Info,
  MapPin,
  Menu,
  Package,
  ScanFace,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Trash2,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams, useSearch } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { BrandLogo, BrandWord } from '@/components/brand-logo';
import { HeaderSearch } from '@/components/header-search';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

import SellerLogin from '@/pages/seller-login';
import SellerPanel from '@/pages/seller-panel';
import SellerAdminPage from '@/pages/seller-admin';
import CheckoutPage from '@/pages/checkout';
import { LegalPage } from '@/pages/legal';
import OrderPage from '@/pages/order';
import SellerOrdersPage from '@/pages/seller-orders';
import SellerAdminOrdersPage from '@/pages/seller-admin-orders';
import { ForgotPasswordPage, ResetPasswordPage, SignInPage, SignUpPage } from '@/pages/auth-pages';
import { dateLabel, money as formatOrderMoney, orderStatusLabel } from '@/pages/order-ui';
import './account.css';
import {
  getGetSellerStoreQueryKey,
  getListAccountOrdersQueryKey,
  getListMySellerApplicationsQueryKey,
  useCreateSellerApplication,
  useGetSellerStore,
  useListAccountOrders,
  useListMySellerApplications,
  useListProducts,
  useListStores,
  type PublicProduct,
  type SellerStore,
} from '@workspace/api-client-react';

const queryClient = new QueryClient();
const CART_STORAGE_KEY = 'eynek.cart.v1';
const WISHLIST_STORAGE_KEY = 'eynek.wishlist.v1';

function readStoredIds(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, ids: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Private mode or full storage: keep the in-memory state only.
  }
}
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

type Product = {
  id: number | string;
  name: string;
  image: string;
  sideImage?: string;
  vendor: string;
  vendorSlug: string;
  price: number;
  type: 'Optik çərçivə' | 'Gün eynəyi';
  gender: 'Qadın' | 'Kişi' | 'Uniseks';
  shape: 'Aviator' | 'Cat-Eye' | 'Rectangle' | 'Round' | 'Square' | 'Wayfarer';
  material: string;
  size: string;
  color: string;
  tone: string;
  frameStyle: string;
  description: string;
  brand: string;
  stock: number;
  isAvailable: boolean;
  location: string;
};

type Vendor = Pick<SellerStore, 'slug' | 'name' | 'initials' | 'location' | 'since' | 'description'> & { count: number };

const shapes: Product['shape'][] = ['Aviator', 'Cat-Eye', 'Rectangle', 'Round', 'Square', 'Wayfarer'];
const genders = ['Qadın', 'Kişi', 'Uniseks'];
const materials = ['Asetat', 'Metal', 'Titanium', 'Bio-nylon'];

function money(value: number) {
  return `${value.toFixed(0)} AZN`;
}

function assetUrl(path: string) {
  if (path.startsWith('/objects/')) return `/api/storage${path}`;
  const sampleCutouts = new Set(['mimoza-02', 'sahil-11', 'nisan-07', 'xezer-air', 'luna-24', 'merdekan-03', 'iceriseher-09', 'caspian-sun']);
  const sampleName = /^product-images\/([a-z0-9-]+)\.jpg$/.exec(path)?.[1];
  if (sampleName && sampleCutouts.has(sampleName)) return `${import.meta.env.BASE_URL}product-images/${sampleName}-cutout.png`;
  return `${import.meta.env.BASE_URL}${path}`;
}

function FrameVisual({ shape, frameStyle = 'clear', sunglasses = false }: { shape: Product['shape']; frameStyle?: string; sunglasses?: boolean }) {
  return (
    <div className={`frame-visual ${shape.toLowerCase()} ${frameStyle} ${sunglasses ? 'sunglass' : ''}`} aria-label={`${shape} çərçivə təsviri`}>
      <span />
      <span />
    </div>
  );
}

// Solid header icons (Material Icons paths, Apache-2.0).
function SolidIcon({ path }: { path: string }) {
  return <svg className="solid-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d={path} fill="currentColor" /></svg>;
}
const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const CART_PATH = 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z';
const ACCOUNT_PATH = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z';

const categoryLinks = [
  { href: '/collection', label: 'Bütün eynəklər' },
  { href: '/collection?type=optical', label: 'Optik çərçivələr' },
  { href: '/collection?type=sunglasses', label: 'Gün eynəkləri' },
];

function CategoryMenu() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);
  return (
    <div className="nav-category" ref={rootRef}>
      <button ref={triggerRef} type="button" className={`nav-category-trigger${location.startsWith('/collection') ? ' active' : ''}`} aria-expanded={open} aria-controls="nav-category-menu" onClick={() => setOpen((current) => !current)} data-testid="button-category-menu">
        Kateqoriya <ChevronDown size={15} strokeWidth={2.4} className="nav-category-chevron" />
      </button>
      {open && (
        <div className="nav-category-menu" id="nav-category-menu" data-testid="menu-category">
          {categoryLinks.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} data-testid={`link-category-${item.href.split('=')[1] ?? 'all'}`}>{item.label}</Link>)}
        </div>
      )}
    </div>
  );
}

function Header({ cartCount, onMenu, menuOpen, products, stores }: { cartCount: number; onMenu: () => void; menuOpen: boolean; products: Product[]; stores: Vendor[] }) {
  const [location] = useLocation();
  return (
    <>
      <header className="topbar">
        <div className="container nav">
          <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Menyunu aç" aria-expanded={menuOpen} aria-controls="mobile-drawer" data-testid="button-menu"><Menu size={19} /></button>
          <Link href="/" className="brand" data-testid="link-brand"><BrandLogo /></Link>
          <nav className="nav-links" aria-label="Əsas menyu">
            <CategoryMenu />
            <Link href="/brands" className={location.startsWith('/brands') ? 'active' : ''} data-testid="link-brands">Brendlər</Link>
            <Link href="/stores" className={location.startsWith('/stores') ? 'active' : ''} data-testid="link-stores">Mağazalar</Link>
            <Link href="/seller" className={location === '/seller' ? 'active' : ''} data-testid="link-seller-cta"><BrandWord />-də sat</Link>
          </nav>
          {/* On phones the search collapses to an icon inside this group; desktop CSS lays the group out in one row. */}
          <div className="nav-actions">
            <HeaderSearch products={products.map((product) => ({ id: product.id, name: product.name, vendor: product.vendor, type: product.type, shape: product.shape, color: product.color, imageUrl: product.image.startsWith('data:') || product.image.startsWith('http') ? product.image : assetUrl(product.image) }))} stores={stores} />
            <Link href="/wishlist" className="icon-button header-icon" aria-label="Seçilmişlər" data-testid="link-wishlist"><SolidIcon path={HEART_PATH} /></Link>
            <Link href="/account" className="icon-button header-icon header-icon--account" aria-label="Hesab" data-testid="link-account"><SolidIcon path={ACCOUNT_PATH} /></Link>
            <Link href="/cart" className="icon-button header-icon cart-button" aria-label="Səbət" data-testid="link-cart"><SolidIcon path={CART_PATH} />{cartCount > 0 && <span className="cart-count">{cartCount}</span>}</Link>
          </div>
        </div>
      </header>
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div><div className="brand"><BrandLogo /></div><p>İstədiyin eynəklər bir platformada. Azərbaycandakı optikaları və çərçivələri bir yerdə kəşf et.</p></div>
        <div><h3>Kəşf et</h3><Link href="/collection">Eynəklər</Link><Link href="/brands">Brendlər</Link><Link href="/stores">Mağazalar</Link></div>
        <div><h3>Müştəri üçün</h3><Link href="/wishlist">Seçilmişlər</Link><Link href="/account">Hesab</Link><Link href="/qaydalar">Qaydalar</Link><Link href="/mexfilik">Məxfilik</Link><Link href="/qaytarma">Qaytarma</Link></div>
        <div><h3>Satıcılar üçün</h3><Link href="/seller"><BrandWord />-də sat</Link><Link href="/satici-muqavilesi">Satıcı müqaviləsi</Link><a href="mailto:sat@eynek.com">Bizimlə əlaqə</a></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} <BrandWord /></span><span>Bakı • Azərbaycan</span></div>
    </footer>
  );
}

function ProductCard({ product, liked, onFavorite, onTryOn }: { product: Product; liked: boolean; onFavorite: (id: number | string) => void; onQuickView: (product: Product) => void; onTryOn: (product: Product) => void }) {
  const [hovered, setHovered] = useState(false);
  const displayImage = hovered && product.sideImage ? product.sideImage : product.image;
  return (
    <article className="product-card" data-testid={`card-product-${product.id}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className={`product-image ${product.tone}`}>
        <Link href={`/product/${product.id}`} className="product-image-link" aria-label={`${product.name} məhsul səhifəsini aç`} data-testid={`link-product-image-${product.id}`}>
          <img className={`product-photo ${hovered && product.sideImage ? 'side-view' : ''}`} src={displayImage.startsWith('data:') || displayImage.startsWith('http') ? displayImage : assetUrl(displayImage)} alt={`${product.name} — ${product.color} eynək modeli ${hovered && product.sideImage ? 'yan görünüş' : 'ön görünüş'}`} loading="lazy" />
        </Link>
        <button className={`heart-button ${liked ? 'liked' : ''}`} onClick={() => onFavorite(product.id)} aria-label={`${product.name} seçilmişlərə əlavə et`} data-testid={`button-favorite-${product.id}`}><Heart size={23} strokeWidth={1.8} fill={liked ? 'currentColor' : 'none'} /></button>
        <div className="product-card-actions">
          <Link href={`/product/${product.id}`} className="quick-view" data-testid={`button-quick-view-${product.id}`}>Məhsula bax</Link>
          <button className="try-card" onClick={() => onTryOn(product)} data-testid={`button-try-on-${product.id}`}><ScanFace size={17} strokeWidth={2} /> Önizlə</button>
        </div>
      </div>
      <div className="product-info">
        <span className="product-label">{product.brand ? `${product.brand} · ${product.type}` : product.type}</span>
        <Link href={`/product/${product.id}`} data-testid={`link-product-${product.id}`}><h3 className="product-name">{product.name}</h3></Link>
        <span className="product-price">{money(product.price)}</span>
        <div className="product-meta"><Link href={`/vendor/${product.vendorSlug}`} className="product-vendor" data-testid={`link-vendor-${product.id}`}>{product.vendor} · {product.location}</Link><span className="product-type">{product.isAvailable ? `${product.stock} stokda` : 'Stokda yoxdur'}</span></div>
      </div>
    </article>
  );
}

type CommonProps = { products: Product[]; stores: Vendor[]; likedIds: Set<number | string>; onFavorite: (id: number | string) => void; onQuickView: (product: Product) => void; onTryOn: (product: Product) => void };

function Home({ products, stores, onQuickView, likedIds, onFavorite, onTryOn }: CommonProps) {
  const featured = products.slice(0, 4);
  return (
    <>
      <main className="home-page">
        <section className="hero">
          <div className="container hero-panel">
            <img className="hero-background hero-background--desktop" src={`${import.meta.env.BASE_URL}hero-eyewear.webp`} alt="" aria-hidden="true" />
            <img className="hero-background hero-background--mobile" src={`${import.meta.env.BASE_URL}hero-eyewear-mobile.webp`} alt="" aria-hidden="true" />
            <div className="hero-content">
              <h1>Sənə yaraşan çərçivəni tap.</h1>
              <p className="hero-sub">Bəyəndiyini seç, almazdan əvvəl yoxla.</p>
              <div className="hero-actions">
                <Link href="/collection" className="btn hero-cta" data-testid="link-hero-collection">Eynəkləri kəşf et <ArrowRight size={16} /></Link>
                <button className="hero-preview-link" disabled={!products[0]} onClick={() => products[0] && onTryOn(products[0])} data-testid="button-hero-tryon"><ScanFace size={16} /> Virtual sınaq</button>
              </div>
              <div className="hero-note"><Info size={14} /> Təsdiqlənmiş satıcı kataloqu · virtual sınaq önizləmədir</div>
            </div>
          </div>
        </section>
        <section className="section home-discover">
          <div className="container">
            <div className="section-head">
              <div><div className="home-overline">Sənin üçün seçildi</div><h2 className="section-title">Eynəkləri kəşf et</h2></div>
              <Link href="/collection" className="home-count" data-testid="link-view-all">{products.length} model <ArrowRight size={14} /></Link>
            </div>
            <div className="home-filter-pills" aria-label="Kateqoriyalar">
              <Link href="/collection" className="selected">Hamısı</Link>
              <Link href="/collection?type=sunglasses">Gün eynəyi</Link>
              <Link href="/collection?type=optical">Optik çərçivə</Link>
              <Link href="/brands">Brendlər</Link>
            </div>
            {featured.length ? (
              <div className="product-grid">
                {featured.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}
              </div>
            ) : (
              <div className="empty-state">
                <Package size={22} />
                <h3>Kataloq hazırlanır.</h3>
                <p>Satıcılar məhsullarını təsdiqə göndərdikcə modellər burada görünəcək.</p>
                <Link href="/collection" className="btn btn-secondary">Kataloqa bax <ArrowRight size={14} /></Link>
              </div>
            )}
          </div>
        </section>
        <section className="section">
          <div className="container">
            <div className="section-head"><div><div className="eyebrow">Kateqoriyalar</div><h2 className="section-title">Nə axtarırsan?</h2></div><p className="section-copy">Gündəlik optik çərçivələr və günəşli Bakı üçün gün eynəkləri.</p></div>
            <div className="feature-layout">
              <Link href="/collection?type=sunglasses" className="feature-card feature-card--dark feature-card--sunglasses" data-testid="link-category-sunglasses">
                <img className="feature-card-photo" src={`${import.meta.env.BASE_URL}feature-images/sunglasses.webp`} alt="" loading="lazy" />
                <div className="eyebrow">Kateqoriya 01</div><h3>Gün eynəkləri</h3><p>Formanı, ölçünü və satıcını müqayisə et.</p>
              </Link>
              <Link href="/collection?type=optical" className="feature-card feature-card--light feature-card--optical" data-testid="link-category-optical">
                <img className="feature-card-photo" src={`${import.meta.env.BASE_URL}feature-images/optical-frames.webp`} alt="" loading="lazy" />
                <div className="eyebrow">Kateqoriya 02</div><h3>Optik çərçivələr</h3><p>Gündəlik istifadə üçün modelləri kəşf et.</p>
              </Link>
            </div>
          </div>
        </section>
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="feature-layout">
              <div className="feature-card feature-card--dark feature-card--virtual">
                <img className="feature-card-photo" src={`${import.meta.env.BASE_URL}feature-images/virtual-preview.webp`} alt="" loading="lazy" />
                <div className="eyebrow">Virtual try-on</div><h3>Almazdan əvvəl üzündə yoxla.</h3><p>Bu interfeys gələcək VTO provayderinə qoşulmaq üçün hazırlanıb. Hazırda kamera və üz izləmə aktiv deyil.</p>
                <button className="btn btn-secondary" disabled={!products[0]} onClick={() => products[0] && onTryOn(products[0])} data-testid="button-home-vto">VTO görünüşünü aç <Video size={14} /></button>
              </div>
              <div className="feature-card feature-card--light feature-card--store">
                <img className="feature-card-photo" src={`${import.meta.env.BASE_URL}feature-images/optical-store.webp`} alt="" loading="lazy" />
                <div className="eyebrow">Marketplace</div><h3>Optikaları bir-bir kəşf etmə.</h3><p>Mağazaları, satıcıları və təsdiqlənmiş məhsullarını bir yerdə gör.</p>
                <Link className="btn" href="/stores" data-testid="link-feature-stores">Mağazalara bax <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
        </section>
        <section className="section" id="stores">
          <div className="container">
            <div className="section-head">
              <div><div className="eyebrow">Satıcılar</div><h2 className="section-title">Mağazalarla tanış ol.</h2></div>
              <Link href="/stores" className="text-link" data-testid="link-home-stores">Bütün mağazalar <ArrowRight size={14} /></Link>
            </div>
            {stores.length ? (
              <div className="store-grid">
                {stores.map((vendor) => (
                  <Link href={`/vendor/${vendor.slug}`} className="store-card" key={vendor.slug} data-testid={`card-home-store-${vendor.slug}`}>
                    <span className="store-mark">{vendor.initials}</span>
                    <span><h3>{vendor.name}</h3><p>{vendor.description}</p><span className="store-meta"><span>{vendor.location}</span><span>{vendor.count} model</span></span></span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Store size={22} />
                <h3>Hələ təsdiqlənmiş mağaza yoxdur.</h3>
                <p>Satıcı müraciətləri təsdiqləndikdən sonra mağazalar burada görünəcək.</p>
                <Link href="/seller" className="btn btn-secondary">Partnyor ol <ArrowRight size={14} /></Link>
              </div>
            )}
          </div>
        </section>
        <section className="section" style={{ paddingTop: 0 }}><div className="container seller-banner"><h2>Mağazanızı <span className="banner-brand-word"><BrandWord />-ə</span> gətirin.</h2><Link href="/seller" className="btn" data-testid="link-home-seller">Partnyor ol <ArrowRight size={14} /></Link></div></section>
      </main>
      <Footer />
    </>
  );
}

function Filters({ filters, setFilters, open, stores, priceCeiling }: { filters: { gender: string; material: string; type: string; maxPrice: number; size: string; seller: string }; setFilters: (filters: { gender: string; material: string; type: string; maxPrice: number; size: string; seller: string }) => void; open: boolean; stores: Vendor[]; priceCeiling: number }) {
  const update = (key: keyof typeof filters, value: string | number) => setFilters({ ...filters, [key]: value });
  return (
    <aside className={`filter-panel ${open ? 'open' : ''}`}>
      <div className="filter-group"><div className="filter-title">Kateqoriya <ChevronDown size={14} /></div>{['Optik çərçivə', 'Gün eynəyi'].map((item) => <label className="check-row" key={item}><input type="radio" name="type" checked={filters.type === item} onChange={() => update('type', filters.type === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Satıcı <ChevronDown size={14} /></div>{stores.map((vendor) => <label className="check-row" key={vendor.slug}><input type="radio" name="seller" checked={filters.seller === vendor.slug} onChange={() => update('seller', filters.seller === vendor.slug ? '' : vendor.slug)} />{vendor.name}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Cins <ChevronDown size={14} /></div>{genders.map((item) => <label className="check-row" key={item}><input type="radio" name="gender" checked={filters.gender === item} onChange={() => update('gender', filters.gender === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Material <ChevronDown size={14} /></div>{materials.map((item) => <label className="check-row" key={item}><input type="radio" name="material" checked={filters.material === item} onChange={() => update('material', filters.material === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Maksimum qiymət</div><input type="range" min="0" max={priceCeiling} step="10" value={filters.maxPrice || priceCeiling} onChange={(event) => { const value = Number(event.target.value); update('maxPrice', value >= priceCeiling ? 0 : value); }} /><div className="range-labels"><span>0 AZN</span><span>{filters.maxPrice ? `${filters.maxPrice} AZN` : 'Limitsiz'}</span></div></div>
      <div className="filter-group"><div className="filter-title">Ölçü <ChevronDown size={14} /></div>{['S', 'M', 'L'].map((item) => <label className="check-row" key={item}><input type="radio" name="size" checked={filters.size === item} onChange={() => update('size', filters.size === item ? '' : item)} />{item} çərçivə</label>)}</div>
    </aside>
  );
}

function Collection({ products, stores, likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const searchParam = params.get('q') ?? '';
  const [query, setQuery] = useState(searchParam);
  useEffect(() => setQuery(searchParam), [searchParam]);
  const [focused, setFocused] = useState(false);
  const [sort, setSort] = useState('Tövsiyə olunan');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ gender: '', material: '', type: '', maxPrice: 0, size: '', seller: '' });
  const priceCeiling = useMemo(() => Math.max(100, Math.ceil(Math.max(0, ...products.map((product) => product.price)) / 10) * 10), [products]);
  const shape = params.get('shape') ?? '';
  const queryType = params.get('type');
  const filtered = useMemo(() => {
    const list = products.filter((product) => {
      const haystack = `${product.name} ${product.brand} ${product.vendor} ${product.shape} ${product.color} ${product.type}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesShape = !shape || product.shape.toLowerCase() === shape.toLowerCase();
      const matchesType = filters.type ? product.type === filters.type : queryType === 'sunglasses' ? product.type === 'Gün eynəyi' : queryType === 'optical' ? product.type === 'Optik çərçivə' : true;
      return matchesQuery && matchesShape && matchesType && (!filters.size || product.size.startsWith(filters.size)) && (!filters.seller || product.vendorSlug === filters.seller) && (!filters.gender || product.gender === filters.gender) && (!filters.material || product.material === filters.material) && (!filters.maxPrice || product.price <= filters.maxPrice);
    });
    if (sort === 'Qiymət: aşağıdan yuxarı') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Qiymət: yuxarıdan aşağı') return [...list].sort((a, b) => b.price - a.price);
    if (sort === 'Ada görə') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, filters, query, queryType, shape, sort]);
  const clearFilters = () => { setFilters({ gender: '', material: '', type: '', maxPrice: 0, size: '', seller: '' }); setQuery(''); setLocation('/collection'); };
  const suggestion = (value: string) => { setQuery(value); setFocused(false); };
  return (
    <>
      <main className="collection-page"><div className="container">
        <div className="collection-intro"><div><div className="eyebrow">Shop</div><h1>Eynəyini<br />burada tap.</h1></div><p>Təsdiqlənmiş optik mağazaların məhsullarını marka, model, forma, satıcı və ölçü ilə axtar.</p></div>
        <div className="collection-tools"><div className="search-box"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} placeholder="Eynək, marka və ya model axtar..." data-testid="input-search-products" />{focused && <div className="search-suggestions"><h4>Tez axtarış</h4><div className="suggestion-row"><button onClick={() => suggestion('Gün eynəyi')} data-testid="button-suggestion-sunglasses">Gün eynəyi</button><button onClick={() => suggestion('Aviator')} data-testid="button-suggestion-aviator">Aviator</button><button onClick={() => suggestion('Optika')} data-testid="button-suggestion-optika">Optika</button></div><h4 style={{ marginTop: 16 }}>Formalar</h4><div className="suggestion-row">{shapes.slice(0, 4).map((item) => <button key={item} onClick={() => suggestion(item)}>{item}</button>)}</div></div>}</div><button className="btn btn-secondary filter-toggle" onClick={() => setFilterOpen(!filterOpen)} data-testid="button-toggle-filters"><SlidersHorizontal size={14} /> Filtrlər</button><select className="select-control" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sıralama" data-testid="select-sort"><option>Tövsiyə olunan</option><option>Qiymət: aşağıdan yuxarı</option><option>Qiymət: yuxarıdan aşağı</option><option>Ada görə</option></select></div>
        <div className="catalog-layout"><Filters filters={filters} setFilters={setFilters} open={filterOpen} stores={stores} priceCeiling={priceCeiling} /><section><div className="catalog-head"><span><strong>{filtered.length}</strong> model</span><button className="text-link" onClick={clearFilters} data-testid="button-clear-filters">Təmizlə <X size={12} /></button></div><div className="product-grid">{filtered.length ? filtered.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />) : <div className="empty-state"><Search size={22} /><h3>Bu axtarışa uyğun eynək tapılmadı.</h3><p>Axtarışı və ya filtrləri bir az yumşalt.</p><button className="btn btn-secondary" onClick={clearFilters} data-testid="button-empty-reset">Filtrləri sıfırla</button></div>}</div></section></div>
      </div></main><Footer />
    </>
  );
}

function StoresPage({ stores }: { stores: Vendor[] }) {
  return <><main className="directory-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Marketplace satıcıları</div><h1>Mağazalar.</h1></div><p><BrandWord />-də satışa təsdiqlənmiş optik mağazaları və onların vitrinlərini kəşf et.</p></div>{stores.length ? <div className="store-grid">{stores.map((vendor) => <Link href={`/vendor/${vendor.slug}`} className="store-card" key={vendor.slug} data-testid={`card-store-${vendor.slug}`}><span className="store-mark">{vendor.initials}</span><span><h3>{vendor.name}</h3><p>{vendor.description}</p><span className="store-meta"><span><MapPin size={12} /> {vendor.location}</span><span>{vendor.count} model</span></span></span><span className="text-link">Mağazaya bax <ArrowRight size={13} /></span></Link>)}</div> : <div className="empty-state"><Store size={22} /><h3>Hələ təsdiqlənmiş mağaza yoxdur.</h3><p>Yeni mağazalar təsdiqləndikcə burada görünəcək.</p></div>}</div></main><Footer /></>;
}

function BrandsPage({ products, likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const brands = [...new Set(products.map((product) => product.brand.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return <><main className="directory-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Brend kəşfi</div><h1>Brendlər.</h1></div><p>Mağazaların təsdiqlənmiş kataloqlarında olan brendlər və modellər.</p></div>{brands.length ? brands.map((brand) => <section className="section" style={{ paddingBottom: 0 }} key={brand}><div className="section-head"><div><div className="eyebrow">Brend</div><h2 className="section-title">{brand}</h2></div></div><div className="product-grid">{products.filter((product) => product.brand.trim() === brand).map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></section>) : <div className="empty-state"><Info size={20} /><h3>Hələ məhsul brendləri yoxdur.</h3><p>Satıcılar məhsullarını təsdiq üçün göndərdikdən sonra brendlər burada görünəcək.</p><Link href="/collection" className="btn btn-secondary">Məhsullara bax <ArrowRight size={14} /></Link></div>}</div></main><Footer /></>;
}

function VendorPage({ products, stores, likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const { slug = '' } = useParams<{ slug: string }>();
  const vendor = stores.find((item) => item.slug === slug);
  if (!vendor) return <NotFound />;
  const items = products.filter((product) => product.vendorSlug === vendor.slug);
  return <><main className="vendor-page"><div className="container"><div className="vendor-hero"><div><div className="eyebrow" style={{ color: '#B7B9C9' }}><BrandWord /> satıcısı</div><h1>{vendor.name}</h1><p>{vendor.description}</p></div><Link href="/stores" className="btn btn-secondary" data-testid="link-vendor-back">Bütün mağazalar</Link></div><div className="vendor-details"><span><MapPin size={14} /> {vendor.location}</span><span>{vendor.since}</span><span><ShoppingBag size={14} /> {vendor.count} model</span></div><section className="section" style={{ padding: '45px 0 0' }}><div className="section-head"><div><div className="eyebrow">Mağaza seçimi</div><h2 className="section-title">Bu vitrində</h2></div></div>{items.length ? <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div> : <div className="empty-state"><Package size={22} /><h3>Hazırda təsdiqlənmiş məhsul yoxdur.</h3></div>}</section></div></main><Footer /></>;
}

function ProductDetail({ products, stores, onAdd, onBuyNow, onTryOn, onQuickView, onFavorite, likedIds }: { products: Product[]; stores: Vendor[]; onAdd: (product: Product, message?: string, quantity?: number) => void; onBuyNow: (product: Product, quantity: number) => void; onTryOn: (product: Product) => void; onQuickView: (product: Product) => void; onFavorite: (id: number | string) => void; likedIds: Set<number | string> }) {
  const { id = '1' } = useParams<{ id: string }>();
  const product = products.find((item) => String(item.id) === id);
  const [quantity, setQuantity] = useState(1);
  const [showSide, setShowSide] = useState(false);
  useEffect(() => {
    setQuantity(1);
    setShowSide(false);
  }, [id]);
  if (!product) return <NotFound />;
  const galleryImage = showSide && product.sideImage ? product.sideImage : product.image;
  const related = products.filter((item) => item.id !== product.id).slice(0, 3);
  const sizeLetter = product.size.slice(0, 1).toUpperCase();
  const swatchColor = { coral: '#bd8170', olive: '#565b45', clear: '#8a8f97', gold: '#bea56d', sunglass: '#272a2d' }[product.frameStyle] ?? '#343840';
  const isPublicUrl = product.image.startsWith('http://') || product.image.startsWith('https://');
  const jsonLd = isPublicUrl ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": [product.image, ...(product.sideImage?.startsWith('http') ? [product.sideImage] : [])],
    "description": product.description,
    "offers": { "@type": "Offer", "priceCurrency": "AZN", "price": product.price, "availability": product.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" }
  } : null;

  return <>
    {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    <main className="detail-page">
      <div className="container">
        <div className="detail-topline">
          <Link href="/collection" className="detail-back"><ArrowRight size={13} /> Eynəklərə qayıt</Link>
          <BrandLogo className="detail-brand-image" />
        </div>
        <div className="detail-layout">
          <div className="detail-gallery">
            <div className="detail-art">
              <img className="detail-photo" src={galleryImage.startsWith('data:') || galleryImage.startsWith('http') ? galleryImage : assetUrl(galleryImage)} alt={`${product.name} — ${showSide ? 'yan' : 'ön'} görünüş`} />
              <button className="detail-try-on" onClick={() => onTryOn(product)} data-testid="button-try-on-detail"><ScanFace size={15} /> Virtual önizlə</button>
            </div>
            {product.sideImage && product.sideImage !== product.image && <div className="detail-gallery-dots" aria-label="Şəkil görünüşü"><button className={!showSide ? 'active' : ''} onClick={() => setShowSide(false)} aria-label="Ön görünüş" /><button className={showSide ? 'active' : ''} onClick={() => setShowSide(true)} aria-label="Yan görünüş" /></div>}
          </div>
          <div className="detail-info">
            <div className="detail-heading">
              <div><div className="eyebrow">{product.vendor.toUpperCase()} · {product.type}</div><h1>{product.name}</h1></div>
              <strong className="detail-price">{money(product.price)}</strong>
            </div>
            <p className="detail-copy">{product.description}</p>
            <Link href={`/vendor/${product.vendorSlug}`} className="detail-seller" data-testid="link-detail-vendor">
              <span className="seller-avatar">{stores.find((vendor) => vendor.slug === product.vendorSlug)?.initials || 'S'}</span>
              <span><strong>{product.vendor}</strong><small>Satıcının vitrininə bax · {product.location}</small></span>
              <ArrowRight size={16} />
            </Link>
            <div className="detail-options">
              <div className="detail-option"><div className="detail-option-label">ÇƏRÇİVƏ ÖLÇÜSÜ</div><div className="detail-size-row"><span className="detail-size-selected">{sizeLetter}</span><span className="detail-option-note">{product.size} · mövcud ölçü</span></div></div>
              <div className="detail-option"><div className="detail-option-label">{product.brand ? 'BREND · RƏNG' : 'RƏNG'}</div><div className="detail-color-row"><span className="detail-color-swatch" style={{ background: swatchColor }} aria-hidden="true" /><span>{product.brand ? `${product.brand} · ` : ''}{product.color}</span></div></div>
            </div>
            <div className="detail-quantity"><div><div className="detail-option-label">SAY</div><small>{product.isAvailable ? `${product.stock} ədəd stokda` : 'Hazırda stokda yoxdur'}</small></div><div className="quantity-stepper"><button disabled={!product.isAvailable || quantity <= 1} onClick={() => setQuantity((count) => Math.max(1, count - 1))} aria-label="Sayı azalt">−</button><span aria-live="polite">{quantity}</span><button disabled={!product.isAvailable || quantity >= Math.min(10, product.stock)} onClick={() => setQuantity((count) => Math.min(10, product.stock, count + 1))} aria-label="Sayı artır">+</button></div></div>
            <div className="detail-purchase"><button className={`detail-favorite ${likedIds.has(product.id) ? 'liked' : ''}`} onClick={() => onFavorite(product.id)} aria-label="Seçilmişlərə əlavə et" data-testid="button-detail-favorite"><Heart size={19} fill={likedIds.has(product.id) ? 'currentColor' : 'none'} /></button><button className="detail-add" disabled={!product.isAvailable} onClick={() => onAdd(product, `${quantity} ədəd ${product.name} səbətə əlavə edildi`, quantity)} data-testid="button-add-cart-detail"><ShoppingBag size={17} /> {product.isAvailable ? `Səbətə əlavə et · ${money(product.price * quantity)}` : 'Stokda yoxdur'}</button><button className="detail-buy-now" disabled={!product.isAvailable} onClick={() => onBuyNow(product, quantity)} data-testid="button-buy-now-detail">İndi sifariş et <ArrowRight size={16} /></button></div>
            <p className="detail-disclaimer">Mağaza sifarişi təsdiqlədikdən sonra çatdırılma haqqı dəqiqləşdirilir; ödəniş qapıda edilir.</p>
          </div>
        </div>
        <section className="detail-related"><div className="section-head"><h2>Digər modellər</h2><Link href="/collection" className="home-count">Hamısına bax <ArrowRight size={14} /></Link></div><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} liked={likedIds.has(item.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></section>
      </div>
    </main>
    <Footer />
  </>;
}

function QuickView({ product, onClose, onAdd, onTryOn }: { product: Product; onClose: () => void; onAdd: (product: Product, message?: string) => void; onTryOn: (product: Product) => void }) {
  return <div className="tryon-backdrop" role="dialog" aria-modal="true" aria-label="Sürətli məhsul baxışı" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="tryon-modal quick-view-modal"><div className="tryon-top" style={{ borderBottom: '1px solid var(--line)', color: 'var(--navy)' }}><div><div className="eyebrow">{product.type}</div><h2>{product.name}</h2><p style={{ color: 'var(--muted)' }}>{product.vendor} · {product.location}</p></div><button className="icon-button" onClick={onClose} aria-label="Baxışı bağla" data-testid="button-close-quick-view"><X size={19} /></button></div><div className="quick-view-layout"><div className={`detail-art quick-view-art ${product.tone}`}><img className="detail-photo" src={product.image.startsWith('data:') || product.image.startsWith('http') ? product.image : assetUrl(product.image)} alt={`${product.name} məhsul fotosu`} /></div><div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><div className="detail-price" style={{ marginTop: 0 }}>{money(product.price)}</div><p className="detail-copy">{product.description}</p><div className="spec-list" style={{ margin: '8px 0 17px' }}><div><dt>Forma</dt><dd>{product.shape}</dd></div><div><dt>Ölçü</dt><dd>{product.size}</dd></div><div><dt>Stok</dt><dd>{product.stock}</dd></div></div><button className="btn btn-full" disabled={!product.isAvailable} onClick={() => onAdd(product)} data-testid="button-add-cart-quick-view"><ShoppingBag size={14} /> {product.isAvailable ? 'Səbətə əlavə et' : 'Stokda yoxdur'}</button><button className="try-link" onClick={() => onTryOn(product)} data-testid="button-try-on-quick-view"><ScanFace size={14} /> Üzümdə yoxla</button></div></div></div></div>;
}

function VirtualTryOn({ products, product, onClose, onSelect, onAdd, onSave }: { products: Product[]; product: Product; onClose: () => void; onSelect: (product: Product) => void; onAdd: (product: Product, message?: string) => void; onSave: (id: number | string) => void }) {
  const options = products.slice(0, 6);
  return <div className="tryon-backdrop" role="dialog" aria-modal="true" aria-label="Üzümdə yoxla"><div className="tryon-modal"><div className="tryon-top"><div><div className="eyebrow" style={{ color: '#B7B9C9' }}>VTO inteqrasiya sərhədi</div><h2>Üzümdə yoxla</h2><p>Provayder qoşulana qədər məhsul önizləməsi</p></div><button className="icon-button close-light" onClick={onClose} aria-label="VTO pəncərəsini bağla" data-testid="button-close-tryon"><X size={20} /></button></div><div className="camera-stage"><div className="provider-state"><Camera size={16} /><span>Kamera icazəsi və VTO provayderi gözlənilir</span></div><div className="preview-product"><FrameVisual shape={product.shape} frameStyle={product.frameStyle} sunglasses={product.type === 'Gün eynəyi'} /><div className="preview-caption">{product.name} · məhsul çərçivəsi önizləməsi</div></div></div><div className="tryon-bottom"><p>Çərçivəni dəyiş</p><div className="frame-switcher">{options.map((option) => <button key={option.id} className={`frame-choice ${option.id === product.id ? 'active' : ''}`} onClick={() => onSelect(option)} aria-label={`${option.name} modelini önizlə`} data-testid={`button-tryon-frame-${option.id}`}><FrameVisual shape={option.shape} frameStyle={option.frameStyle} /><small>{option.name}</small></button>)}</div><div className="tryon-actions"><button className="btn btn-secondary" onClick={() => onSave(product.id)} data-testid="button-save-tryon"><Heart size={14} /> Yadda saxla</button><button className="btn btn-blue" disabled={!product.isAvailable} onClick={() => onAdd(product, 'Model səbətə əlavə edildi')} data-testid="button-add-cart-tryon"><ShoppingBag size={14} /> {product.isAvailable ? 'Səbətə əlavə et' : 'Stokda yoxdur'}</button></div></div></div></div>;
}

type SellerForm = { storeName: string; owner: string; phone: string; email: string; business: string; tax: string; address: string; instagram: string; website: string; categories: string };
const initialSellerForm: SellerForm = { storeName: '', owner: '', phone: '', email: '', business: '', tax: '', address: '', instagram: '', website: '', categories: '' };

function SellerPage() {
  const { user, isLoaded } = useAuthSession();
  const userEmail = user?.email;
  const queryClient = useQueryClient();
  const createApplication = useCreateSellerApplication();
  const myApplications = useListMySellerApplications({ query: { queryKey: getListMySellerApplicationsQueryKey(), enabled: isLoaded && Boolean(userEmail) } });
  const [form, setForm] = useState<SellerForm>(initialSellerForm);
  const [errors, setErrors] = useState<Partial<Record<keyof SellerForm, string>>>({});
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const update = (key: keyof SellerForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (userEmail) setForm((current) => current.email ? current : { ...current, email: userEmail });
  }, [userEmail]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Partial<Record<keyof SellerForm, string>> = {};
    (['storeName', 'owner', 'phone', 'email', 'business', 'address', 'categories'] as const).forEach((key) => { if (!form[key].trim()) next[key] = 'Bu sahə tələb olunur.'; });
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Düzgün e-poçt ünvanı yazın.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitError('');
    try {
      await createApplication.mutateAsync({
        data: {
          storeName: form.storeName.trim(),
          ownerName: form.owner.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          business: form.business.trim(),
          tax: form.tax.trim(),
          address: form.address.trim(),
          instagram: form.instagram.trim(),
          website: form.website.trim(),
          categories: form.categories.trim(),
        },
      });
      setSent(true);
      if (userEmail) await queryClient.invalidateQueries({ queryKey: getListMySellerApplicationsQueryKey() });
    } catch {
      setSubmitError('Müraciət göndərilmədi. Məlumatları yoxlayıb yenidən cəhd edin.');
    }
  };
  const field = (key: keyof SellerForm, label: string, required = false, type = 'text') => <div className="field"><label htmlFor={`seller-${key}`}>{label}{required ? ' *' : ''}</label><input id={`seller-${key}`} type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} aria-invalid={Boolean(errors[key])} data-testid={`input-seller-${key}`} />{errors[key] && <span className="field-error">{errors[key]}</span>}</div>;
  const applications = myApplications.data ?? [];
  const latestApplication = applications[0];
  const statusText: Record<string, string> = { pending: 'Gözləmədə', approved: 'Təsdiqləndi', rejected: 'Rədd edildi', needs_changes: 'Dəyişiklik tələb olunur' };
  const hasPendingOrApproved = applications.some((application) => application.status === 'pending' || application.status === 'approved');
  return <><main className="seller-page"><div className="container form-shell"><div className="seller-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-start', maxWidth: '100%' }}><div style={{ maxWidth: '700px' }}><div className="eyebrow">Satıcı onboarding</div><h1><BrandWord />-də sat.</h1><p>Mağazanızı <BrandWord />-ə qoşun və məhsullarınızı Bakı və Abşerondakı daha çox müştəriyə çatdırın. Müraciətlər saxlanılır və təsdiqdən sonra satıcı hesabı aktivləşdirilir.</p></div><Link href="/seller-login" className="btn btn-secondary" data-testid="link-seller-login">Mövcud satıcı? Daxil ol</Link></div>{myApplications.isSuccess && !latestApplication && <p data-testid="status-my-applications-loaded">Hələ müraciətiniz yoxdur.</p>}{(sent || latestApplication) && <div className="form-success" data-testid="status-seller-application"><strong>Müraciət statusu: {statusText[latestApplication?.status ?? 'pending']}</strong>{latestApplication?.reviewNotes && <p>{latestApplication.reviewNotes}</p>}{latestApplication?.status === 'approved' && <p>Satıcı hesabınız aktivdir. <Link href="/seller-panel">Panelə keç</Link></p>}{sent && <p>Məlumatlarınız nəzərdən keçirilmək üçün saxlanıldı.</p>}</div>}{!hasPendingOrApproved && !sent && <form className="seller-form" onSubmit={submit} noValidate>{field('storeName', 'Mağaza adı', true)}{field('owner', 'Məsul şəxs', true)}{field('phone', 'Telefon', true, 'tel')}{field('email', 'E-poçt', true, 'email')}<div className="field full"><label htmlFor="seller-business">Biznes haqqında *</label><textarea id="seller-business" value={form.business} onChange={(event) => update('business', event.target.value)} aria-invalid={Boolean(errors.business)} data-testid="input-seller-business" />{errors.business && <span className="field-error">{errors.business}</span>}</div>{field('tax', 'VÖEN (əgər varsa)')}{field('address', 'Mağaza ünvanı', true)}{field('instagram', 'Instagram')}{field('website', 'Veb-sayt')}{field('categories', 'Məhsul kateqoriyaları', true)}<div className="field full"><span className="field-help">Müraciət zamanı mağaza şəkilləri və tələb olunan sənədlər növbəti mərhələdə komanda tərəfindən istənilə bilər.</span></div>{submitError && <div className="field-error" role="alert">{submitError}</div>}<div className="form-actions"><button className="btn" type="submit" disabled={createApplication.isPending} data-testid="button-submit-seller">{createApplication.isPending ? 'Göndərilir...' : 'Müraciəti göndər'} <ArrowRight size={14} /></button><span className="field-help">* məcburi sahələr</span></div></form>}</div></main><Footer /></>;
}

function WishlistPage({ products, likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const items = products.filter((product) => likedIds.has(product.id));
  return <><main className="collection-page"><div className="container"><div className="collection-intro"><div><div className="eyebrow">Seçilmişlər</div><h1>Saxladığın<br />modellər.</h1></div><p>Qonaq seçilmişləri bu brauzerdə saxlanılır. Modelə bax, VTO önizləməsini aç və ya seçimini sil.</p></div><div className="product-grid wishlist-grid">{items.length ? items.map((product) => <ProductCard key={product.id} product={product} liked onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />) : <div className="empty-state"><Heart size={22} /><h3>Hələ seçilmiş model yoxdur.</h3><p>Bəyəndiyin çərçivələrdə ürək işarəsinə toxun.</p><Link href="/collection" className="btn btn-secondary" data-testid="link-empty-wishlist">Eynəklərə bax</Link></div>}</div></div></main><Footer /></>;
}

function CartPage({ items, stores, onRemove, onCheckout }: { items: Product[]; stores: Vendor[]; onRemove: (id: number | string) => void; onCheckout: () => void }) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const grouped = stores.map((vendor) => ({ vendor, items: items.filter((item) => item.vendorSlug === vendor.slug) })).filter((group) => group.items.length);
  return <><main className="cart-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Səbət</div><h1>Sifarişin.</h1></div><p>Marketplace səbətində məhsullar satıcıya görə qruplaşdırılır.</p></div>{items.length ? <div className="cart-panel"><h2>{items.length} məhsul</h2>{grouped.map((group) => <div className="cart-items" key={group.vendor.slug}><div className="eyebrow">{group.vendor.name}</div>{group.items.map((item) => <div className="cart-row" key={`${item.id}-${group.vendor.slug}`}><span><strong>{item.name}</strong><small>{money(item.price)} · {item.size}</small></span><button className="icon-button" onClick={() => onRemove(item.id)} aria-label={`${item.name} sil`} data-testid={`button-remove-cart-${item.id}`}><Trash2 size={15} /></button></div>)}</div>)}<div className="cart-row"><strong>Cəmi</strong><strong>{money(total)}</strong></div><button className="btn" onClick={onCheckout} data-testid="button-checkout">Sifarişə keç <ArrowRight size={14} /></button></div> : <div className="empty-state"><ShoppingBag size={22} /><h3>Səbətin hələ boşdur.</h3><p>Məhsulları bir neçə satıcıdan seçib burada toplaya bilərsən.</p><Link href="/collection" className="btn btn-secondary" data-testid="link-empty-cart">Eynəklərə bax</Link></div>}</div></main><Footer /></>;
}

function AccountPage() {
  const { isLoaded, isSignedIn, user } = useAuthSession();
  const orders = useListAccountOrders({
    query: {
      queryKey: getListAccountOrdersQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
      retry: false,
    },
  });
  const email = user?.email;
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const orderCount = orders.data?.length ?? 0;
  const shortcuts = isSignedIn
    ? [
        { href: '#orders', icon: <Package size={20} strokeWidth={1.8} />, title: 'Sifarişlərim', text: orders.isLoading ? 'Yüklənir…' : `${orderCount} sifariş`, testId: 'link-account-orders' },
        { href: '/wishlist', icon: <Heart size={20} strokeWidth={1.8} />, title: 'Seçilmişlər', text: 'Bəyəndiyin çərçivələr', testId: 'link-account-wishlist' },
        { href: '/forgot-password', icon: <ShieldCheck size={20} strokeWidth={1.8} />, title: 'Şifrəni dəyiş', text: 'E-poçt linki ilə yenilə', testId: 'link-account-password' },
      ]
    : [
        { href: '/wishlist', icon: <Heart size={20} strokeWidth={1.8} />, title: 'Seçilmişlər', text: 'Bu brauzerdə saxladıqların', testId: 'link-account-wishlist' },
        { href: '/cart', icon: <ShoppingBag size={20} strokeWidth={1.8} />, title: 'Səbət', text: 'Seçdiyin məhsullar', testId: 'link-account-cart' },
        { href: '/collection', icon: <Glasses size={20} strokeWidth={1.8} />, title: 'Eynəklərə bax', text: 'Optik və gün eynəkləri', testId: 'link-account-collection' },
      ];
  return (
    <>
      <main className="account-page">
        <section className="account-hero-section">
          <div className="container account-hero">
            <img className="account-hero-art account-hero-art--desktop" src={`${import.meta.env.BASE_URL}hero-eyewear.webp`} alt="" aria-hidden="true" />
            <img className="account-hero-art account-hero-art--mobile" src={`${import.meta.env.BASE_URL}hero-eyewear-mobile.webp`} alt="" aria-hidden="true" />
            <div className="account-hero-content">
              <span className="account-overline">Hesabım</span>
              {!isLoaded ? (
                <div className="account-loading-skeleton" role="status" data-testid="status-account-loading" aria-label="Hesab məlumatları yüklənir"><span /><span /><span /></div>
              ) : isSignedIn ? (
                <>
                  <h1>Salam{firstName ? `, ${firstName}` : ''}.</h1>
                  <p className="account-hero-sub" data-testid="text-account-identity">{email} ilə daxil olmusan. Sifarişlərin və seçimlərin burada.</p>
                  <div className="account-hero-actions">
                    <Link href="/collection" className="btn account-cta" data-testid="link-account-shop">Eynəkləri kəşf et <ArrowRight size={16} /></Link>
                    <button className="account-text-action" type="button" onClick={() => void signOutAndGo('/')} data-testid="button-account-sign-out">Hesabdan çıx</button>
                  </div>
                </>
              ) : (
                <>
                  <h1>Sifarişlərin bir yerdə.</h1>
                  <p className="account-hero-sub">Daxil ol və ya hesab yarat: sifarişlərini izlə, bəyəndiyin çərçivələri saxla.</p>
                  <div className="account-hero-actions">
                    <Link href="/sign-in?redirect_url=%2Faccount" className="btn account-cta" data-testid="link-account-sign-in">Daxil ol <ArrowRight size={16} /></Link>
                    <Link href="/sign-up" className="account-text-action" data-testid="link-account-sign-up">Hesab yarat</Link>
                  </div>
                  <div className="account-hero-note"><Info size={14} /> Hesab məcburi deyil, qonaq kimi də sifariş verə bilərsən.</div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="account-shortcuts-section">
          <div className="container account-shortcuts">
            {shortcuts.map((item) => {
              const body = <><span className="account-shortcut-icon">{item.icon}</span><span className="account-shortcut-text"><strong>{item.title}</strong><small>{item.text}</small></span><ArrowRight size={16} className="account-shortcut-arrow" /></>;
              return item.href.startsWith('#')
                ? <a key={item.href} href={item.href} className="account-shortcut" data-testid={item.testId}>{body}</a>
                : <Link key={item.href} href={item.href} className="account-shortcut" data-testid={item.testId}>{body}</Link>;
            })}
          </div>
        </section>

        {isLoaded && isSignedIn && (
          <section className="account-orders" id="orders" aria-labelledby="account-orders-heading">
            <div className="container">
              <div className="section-head">
                <div><div className="home-overline">Sifariş tarixçəsi</div><h2 className="section-title" id="account-orders-heading">Sifarişlərin</h2></div>
                <span className="home-count" data-testid="text-account-order-count">{orderCount} sifariş</span>
              </div>
              {orders.isLoading ? (
                <div className="account-empty account-orders-loading" role="status" data-testid="status-account-orders-loading" aria-label="Sifarişlər yüklənir"><span /><span /></div>
              ) : orders.isError ? (
                <div className="account-empty" role="alert" data-testid="status-account-orders-error">
                  <ShieldCheck size={20} aria-hidden="true" />
                  <span>Sifariş tarixçəsini yükləmək alınmadı. Yenidən yoxlayın.</span>
                  <button className="text-link" type="button" onClick={() => void orders.refetch()} data-testid="button-account-orders-retry">Yenidən cəhd et <ArrowRight size={14} /></button>
                </div>
              ) : orders.data?.length ? (
                <div className="account-order-list">
                  {orders.data.map((order) => (
                    <article className="account-order-card" key={order.id} data-testid={`card-account-order-${order.id}`}>
                      <div className="account-order-main">
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <span>{orderStatusLabel(order.status, order.fulfillmentMethod)}</span>
                        </div>
                        <div>
                          <strong>{order.totalAzN === null ? 'Məbləğ təsdiqlənir' : formatOrderMoney(order.totalAzN)}</strong>
                          <span>{dateLabel(order.createdAt)}</span>
                        </div>
                      </div>
                      <Link href={`/order/${order.id}`} className="text-link" data-testid={`link-account-order-${order.id}`}>
                        Sifarişə bax <ArrowRight size={14} />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="account-empty" data-testid="status-account-orders-empty">
                  <Package size={20} strokeWidth={1.7} aria-hidden="true" />
                  <span>Hələ bu hesabla sifariş verməmisən. Qonaq sifarişləri hesab tarixçəsinə əlavə olunmur.</span>
                  <Link href="/collection" className="text-link" data-testid="link-account-empty-orders-shop">Eynəklərə bax <ArrowRight size={14} /></Link>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

function MobileBottomNav({ onTryOn }: { onTryOn: () => void }) {
  const [location] = useLocation();
  return <nav className="mobile-bottom-nav" aria-label="Mobil menyu"><Link href="/" className={location === '/' ? 'active' : ''} data-testid="mobile-nav-home"><Store size={16} />Ana səhifə</Link><Link href="/collection" className={location.startsWith('/collection') ? 'active' : ''} data-testid="mobile-nav-shop"><Search size={16} />Shop</Link><button className="vto-nav" onClick={onTryOn} data-testid="mobile-nav-vto"><ScanFace size={19} />VTO</button><Link href="/wishlist" className={location.startsWith('/wishlist') ? 'active' : ''} data-testid="mobile-nav-wishlist"><Heart size={16} />Seçilmişlər</Link><Link href="/account" className={location.startsWith('/account') ? 'active' : ''} data-testid="mobile-nav-account"><UserRound size={16} />Hesab</Link></nav>;
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, a[href]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="mobile-drawer-layer">
      <button type="button" className="mobile-drawer-backdrop" onClick={onClose} aria-label="Menyunu bağla" tabIndex={-1} />
      <aside ref={drawerRef} id="mobile-drawer" className="mobile-drawer-panel" role="dialog" aria-modal="true" aria-label="Mobil menyu" data-testid="mobile-drawer">
        <div className="mobile-drawer-header">
          <Link href="/" onClick={onClose} aria-label="EYNƏK.com ana səhifə"><BrandLogo /></Link>
          <button ref={closeRef} type="button" className="mobile-drawer-close" onClick={onClose} aria-label="Menyunu bağla" data-testid="button-close-menu"><X size={21} /></button>
        </div>
        <div className="mobile-drawer-body">
          <div className="mobile-drawer-account">
            <span className="mobile-drawer-avatar"><UserRound size={23} /></span>
            <div><strong>Xoş gəlmisən!</strong><p>Seçdiklərini və səbətini bir yerdə gör.</p></div>
            <Link href="/account" className="mobile-drawer-account-link" onClick={onClose}>Hesabıma bax <ArrowRight size={16} /></Link>
          </div>
          <div className="mobile-drawer-label">KƏŞF ET</div>
          <nav className="mobile-drawer-links" aria-label="Mobil bölmələr">
            <Link href="/collection" onClick={onClose} data-testid="link-mobile-collection">Bütün eynəklər <ChevronRight size={18} /></Link>
            <Link href="/collection?type=sunglasses" onClick={onClose}>Gün eynəkləri <ChevronRight size={18} /></Link>
            <Link href="/collection?type=optical" onClick={onClose}>Optik çərçivələr <ChevronRight size={18} /></Link>
            <Link href="/brands" onClick={onClose} data-testid="link-mobile-brands">Brendlər <ChevronRight size={18} /></Link>
            <Link href="/stores" onClick={onClose} data-testid="link-mobile-stores">Mağazalar <ChevronRight size={18} /></Link>
          </nav>
          <div className="mobile-drawer-label mobile-drawer-label--secondary">SƏNİN ÜÇÜN</div>
          <nav className="mobile-drawer-links" aria-label="Şəxsi keçidlər">
            <Link href="/wishlist" onClick={onClose}>Seçilmişlər <ChevronRight size={18} /></Link>
            <Link href="/cart" onClick={onClose}>Səbətim <ChevronRight size={18} /></Link>
            <Link href="/seller" onClick={onClose} data-testid="link-mobile-seller"><span><BrandWord />-də sat</span><ChevronRight size={18} /></Link>
          </nav>
        </div>
      </aside>
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Storefront() {
  const [location, setLocation] = useLocation();
  const productsQuery = useListProducts();
  const storesQuery = useListStores();
  const productRows = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const storeRows = Array.isArray(storesQuery.data) ? storesQuery.data : [];
  const allProducts = useMemo(
    () =>
      productRows.map((product: PublicProduct): Product => ({
        id: product.id,
        name: product.name,
        image: product.frontImage,
        sideImage: product.sideImage,
        vendor: product.vendor,
        vendorSlug: product.vendorSlug,
        price: product.price,
        type: product.category,
        gender: product.gender,
        shape: product.shape,
        material: product.material,
        size: product.size,
        color: product.color,
        tone: 'tone-1',
        frameStyle: product.category === 'Gün eynəyi' ? 'sunglass' : product.material === 'Metal' ? 'gold' : 'clear',
        description: product.description || `${product.brand ? `${product.brand} · ` : ''}${product.category} modeli.`,
        brand: product.brand,
        stock: product.stock,
        isAvailable: product.isAvailable,
        location: product.location,
      })),
    [productRows],
  );
  const stores = useMemo(
    () =>
      storeRows.map((store: SellerStore): Vendor => ({
        slug: store.slug,
        name: store.name,
        initials: store.initials,
        location: store.location,
        since: store.since,
        description: store.description,
        count: store.productCount,
      })),
    [storeRows],
  );

  const [cartIds, setCartIds] = useState<string[]>(() => readStoredIds(CART_STORAGE_KEY));
  const [likedIds, setLikedIds] = useState<Set<number | string>>(() => new Set(readStoredIds(WISHLIST_STORAGE_KEY)));
  useEffect(() => writeStoredIds(CART_STORAGE_KEY, cartIds), [cartIds]);
  useEffect(() => writeStoredIds(WISHLIST_STORAGE_KEY, [...likedIds].map(String)), [likedIds]);
  const productsById = useMemo(() => new Map(allProducts.map((product) => [String(product.id), product])), [allProducts]);
  // Cart holds ids only; price and availability always come from the live catalog.
  const cartItems = useMemo(
    () => cartIds.flatMap((id) => { const product = productsById.get(id); return product ? [product] : []; }),
    [cartIds, productsById],
  );
  const addUnits = (product: Product, quantity: number) => setCartIds((current) => {
    const id = String(product.id);
    const inCart = current.filter((item) => item === id).length;
    const room = Math.max(0, Math.min(product.stock, 10) - inCart);
    return [...current, ...Array.from({ length: Math.min(room, Math.max(1, quantity)) }, () => id)];
  });
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenu(false), []);
  useEffect(() => { closeMobileMenu(); }, [location, closeMobileMenu]);
  const cartCount = cartItems.length;
  const checkoutItems = useMemo(() => {
    const grouped = new Map<string, {
      productId: string;
      productName: string;
      sellerName: string;
      sellerLocation: string;
      quantity: number;
      unitPriceAzN: number;
      lineTotalAzN: number;
    }>();
    for (const product of cartItems) {
      const id = String(product.id);
      const current = grouped.get(id);
      if (current) {
        current.quantity += 1;
        current.lineTotalAzN += product.price;
      } else {
        grouped.set(id, {
          productId: id,
          productName: product.name,
        sellerName: product.vendor,
        sellerLocation: product.location,
        quantity: 1,
          unitPriceAzN: product.price,
          lineTotalAzN: product.price,
        });
      }
    }
    return [...grouped.values()];
  }, [cartItems]);
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2300); };
  const toggleFavorite = (id: number | string) => { setLikedIds((current) => { const next = new Set(current); if (next.has(id)) { next.delete(id); showToast('Seçilmişlərdən çıxarıldı'); } else { next.add(id); showToast('Seçilmişlərə əlavə edildi'); } return next; }); };
  const addToCart = (product: Product, message = `${product.name} səbətə əlavə edildi`, quantity = 1) => { if (!product.isAvailable) { showToast('Bu məhsul hazırda stokda yoxdur'); return; } addUnits(product, quantity); setQuickProduct(null); setTryOnProduct(null); showToast(message); };
  const buyNow = (product: Product, quantity = 1) => {
    if (!product.isAvailable) { showToast('Bu məhsul hazırda stokda yoxdur'); return; }
    addUnits(product, quantity);
    setLocation('/checkout');
  };
  const removeFromCart = (id: number | string) => setCartIds((current) => { const index = current.indexOf(String(id)); return index === -1 ? current : current.filter((_, itemIndex) => itemIndex !== index); });
  const common: CommonProps = {
    products: allProducts,
    stores,
    likedIds,
    onFavorite: toggleFavorite,
    onQuickView: (product) => setQuickProduct(product),
    onTryOn: (product) => setTryOnProduct(product),
  };
  const catalogError = productsQuery.error || storesQuery.error;
  if (location === '/checkout') {
    return <CheckoutPage items={checkoutItems} stores={stores} onClearCart={() => setCartIds([])} />;
  }
  if (location.startsWith('/order/')) return <OrderPage />;
  return (
    <div className="app-shell">
      <Header cartCount={cartCount} products={allProducts} stores={stores} menuOpen={mobileMenu} onMenu={() => setMobileMenu((open) => !open)} />
      {mobileMenu && <MobileDrawer onClose={closeMobileMenu} />}
      {catalogError && <div className="container" role="status" style={{ paddingTop: 12, color: 'var(--muted)' }}>Kataloq yüklənmədi. Səhifəni yeniləyib yenidən cəhd edin.</div>}
      <Switch>
        <Route path="/collection"><Collection {...common} /></Route>
        <Route path="/stores"><StoresPage stores={stores} /></Route>
        <Route path="/brands"><BrandsPage {...common} /></Route>
        <Route path="/seller"><SellerPage /></Route>
        <Route path="/wishlist"><WishlistPage {...common} /></Route>
        <Route path="/cart"><CartPage items={cartItems} stores={stores} onRemove={removeFromCart} onCheckout={() => setLocation('/checkout')} /></Route>
        <Route path="/account"><AccountPage /></Route>
        <Route path="/qaydalar"><LegalPage slug="qaydalar" /></Route>
        <Route path="/mexfilik"><LegalPage slug="mexfilik" /></Route>
        <Route path="/qaytarma"><LegalPage slug="qaytarma" /></Route>
        <Route path="/satici-muqavilesi"><LegalPage slug="satici-muqavilesi" /></Route>
        <Route path="/vendor/:slug"><VendorPage {...common} /></Route>
        <Route path="/product/:id"><ProductDetail products={allProducts} stores={stores} onAdd={addToCart} onBuyNow={buyNow} onTryOn={(product) => setTryOnProduct(product)} onQuickView={(product) => setQuickProduct(product)} onFavorite={toggleFavorite} likedIds={likedIds} /></Route>
        <Route path="/"><Home {...common} /></Route>
        <Route component={NotFound} />
      </Switch>
      <MobileBottomNav onTryOn={() => { const first = allProducts[0]; if (first) setTryOnProduct(first); }} />
      {quickProduct && <QuickView product={quickProduct} onClose={() => setQuickProduct(null)} onAdd={addToCart} onTryOn={(product) => setTryOnProduct(product)} />}
      {tryOnProduct && <VirtualTryOn products={allProducts} product={tryOnProduct} onClose={() => setTryOnProduct(null)} onSelect={setTryOnProduct} onAdd={addToCart} onSave={toggleFavorite} />}
      {toast && <div className="toast" role="status" data-testid="status-toast"><Check size={16} /><span>{toast}</span></div>}
    </div>
  );
}

function AppRoutes() {
  useClearQueriesOnUserChange();
  return (
    <TooltipProvider>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/seller-login"><SellerLogin /></Route>
          <Route path="/seller-panel"><SellerPanel /></Route>
          <Route path="/seller-panel/*"><SellerPanel /></Route>
          <Route path="/seller-orders"><SellerOrdersPage /></Route>
          <Route path="/seller-admin/orders"><SellerAdminOrdersPage /></Route>
          <Route path="/seller-admin"><SellerAdminPage /></Route>
          <Route><Storefront /></Route>
        </Switch>
      </RoutedErrorBoundary>
      <Toaster />
    </TooltipProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <AppRoutes />
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
