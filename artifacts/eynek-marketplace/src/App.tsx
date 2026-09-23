import { type FormEvent, type ReactNode, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Heart,
  Info,
  MapPin,
  Menu,
  ScanFace,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Trash2,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams, useSearch } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { BrandLogo, BrandWord } from '@/components/brand-logo';
import { HeaderSearch } from '@/components/header-search';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

import SellerLogin from '@/pages/seller-login';
import SellerPanel from '@/pages/seller-panel';
import { useListProducts } from '@workspace/api-client-react';

const queryClient = new QueryClient();

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
};

type Vendor = {
  slug: string;
  name: string;
  initials: string;
  location: string;
  since: string;
  description: string;
  count: number;
};

const defaultProducts: Product[] = [
  { id: 1, name: 'Mimoza 02', image: 'product-images/mimoza-02.jpg', sideImage: 'product-images/mimoza-02.jpg', vendor: 'Optika Nərgiz', vendorSlug: 'optika-nergiz', price: 118, type: 'Optik çərçivə', gender: 'Qadın', shape: 'Cat-Eye', material: 'Asetat', size: 'M (52–18)', color: 'Kərpic / şampan', tone: 'tone-1', frameStyle: 'coral', description: 'Yumşaq cat-eye xətti və isti kərpic tonu ilə gündəlik görünüşə sakit xarakter verir.' },
  { id: 2, name: 'Sahil 11', image: 'product-images/sahil-11.jpg', sideImage: 'product-images/sahil-11.jpg', vendor: 'Bakı Optik', vendorSlug: 'baki-optik', price: 145, type: 'Gün eynəyi', gender: 'Uniseks', shape: 'Wayfarer', material: 'Asetat', size: 'L (55–19)', color: 'Zeytun', tone: 'tone-2', frameStyle: 'olive', description: 'Günəşli Bakı günləri üçün dərin zeytun asetat və polarizə linza.' },
  { id: 3, name: 'Nişan 07', image: 'product-images/nisan-07.jpg', vendor: 'Lalə Optik', vendorSlug: 'lale-optik', price: 92, type: 'Optik çərçivə', gender: 'Uniseks', shape: 'Rectangle', material: 'Metal', size: 'M (51–19)', color: 'Qrafit', tone: 'tone-3', frameStyle: 'clear', description: 'İncə metal konstruksiya, yüngül burun körpüsü və təmiz düzbucaqlı forma.' },
  { id: 4, name: 'Xəzər Air', image: 'product-images/xezer-air.jpg', vendor: 'Dəniz Optika', vendorSlug: 'deniz-optika', price: 164, type: 'Gün eynəyi', gender: 'Kişi', shape: 'Aviator', material: 'Titanium', size: 'L (58–16)', color: 'Qızılı / yaşıl', tone: 'tone-4', frameStyle: 'gold', description: 'Titanium aviator quruluşu ilə yüngül və davamlı sahil üslubu.' },
  { id: 5, name: 'Luna 24', image: 'product-images/luna-24.jpg', vendor: 'Optika Nərgiz', vendorSlug: 'optika-nergiz', price: 127, type: 'Optik çərçivə', gender: 'Qadın', shape: 'Round', material: 'Asetat', size: 'S (49–20)', color: 'Tünd tısbağa', tone: 'tone-5', frameStyle: 'olive', description: 'Dairəvi siluet və tünd tısbağa naxışı ilə retro, amma bu günə aid.' },
  { id: 6, name: 'Mərdəkan 03', image: 'product-images/merdekan-03.jpg', vendor: 'Bakı Optik', vendorSlug: 'baki-optik', price: 139, type: 'Gün eynəyi', gender: 'Uniseks', shape: 'Square', material: 'Asetat', size: 'M (53–18)', color: 'Qara / çay', tone: 'tone-1', frameStyle: 'sunglass', description: 'Kvadrat ön hissə və çay rəngli linza ilə şəhər ritminə uyğun gün eynəyi.' },
  { id: 7, name: 'İçərişəhər 09', image: 'product-images/iceriseher-09.jpg', vendor: 'Lalə Optik', vendorSlug: 'lale-optik', price: 109, type: 'Optik çərçivə', gender: 'Kişi', shape: 'Rectangle', material: 'Metal', size: 'L (55–18)', color: 'Fırçalanmış gümüş', tone: 'tone-2', frameStyle: 'clear', description: 'Klassik düzbucaqlı xətt, metalik sakitlik və ofisdən axşama rahat keçid.' },
  { id: 8, name: 'Caspian Sun', image: 'product-images/caspian-sun.jpg', vendor: 'Dəniz Optika', vendorSlug: 'deniz-optika', price: 151, type: 'Gün eynəyi', gender: 'Qadın', shape: 'Cat-Eye', material: 'Bio-nylon', size: 'M (53–17)', color: 'Şəffaf bal', tone: 'tone-4', frameStyle: 'coral', description: 'Bal rəngli şəffaf bio-nylon, qaldırılmış künclər və yumşaq linza tonu.' },
];

const vendors: Vendor[] = [
  { slug: 'optika-nergiz', name: 'Optika Nərgiz', initials: 'ON', location: '28 May, Bakı', since: '2008-dən', count: 2, description: 'Qadın və uniseks çərçivələrdə seçilmiş rənglər və şəhər üslubu.' },
  { slug: 'baki-optik', name: 'Bakı Optik', initials: 'BO', location: 'Nizami küçəsi, Bakı', since: '2014-dən', count: 2, description: 'Klassik formaları müasir materiallarla birləşdirən ailə optikası.' },
  { slug: 'lale-optik', name: 'Lalə Optik', initials: 'LO', location: 'Elmlər Akademiyası, Bakı', since: '2011-dən', count: 2, description: 'Yüngül metal çərçivələr və ölçü üzrə dəqiq uyğunlaşdırma.' },
  { slug: 'deniz-optika', name: 'Dəniz Optika', initials: 'DO', location: 'Sahil, Bakı', since: '2018-dən', count: 2, description: 'Gün eynəkləri və Xəzər işığına uyğun rəng seçimləri.' },
];

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

function Header({ cartCount, onMenu, menuOpen, products }: { cartCount: number; onMenu: () => void; menuOpen: boolean; products: Product[] }) {
  const [location] = useLocation();
  return (
    <>
      <header className="topbar">
        <div className="container nav">
          <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Menyunu aç" aria-expanded={menuOpen} aria-controls="mobile-drawer" data-testid="button-menu"><Menu size={19} /></button>
          <Link href="/" className="brand" data-testid="link-brand"><BrandLogo /></Link>
          <nav className="nav-links" aria-label="Əsas menyu">
            <Link href="/collection" className={location.startsWith('/collection') ? 'active' : ''} data-testid="link-collection">Kəşf et</Link>
            <Link href="/collection?type=sunglasses" data-testid="link-sunglasses">Gün eynəkləri</Link>
            <Link href="/brands" className={location.startsWith('/brands') ? 'active' : ''} data-testid="link-brands">Brendlər</Link>
            <Link href="/stores" className={location.startsWith('/stores') ? 'active' : ''} data-testid="link-stores">Mağazalar</Link>
          </nav>
          <div className="nav-actions">
            <HeaderSearch products={products.map((product) => ({ id: product.id, name: product.name, vendor: product.vendor, type: product.type, shape: product.shape, color: product.color, imageUrl: product.image.startsWith('data:') || product.image.startsWith('http') ? product.image : assetUrl(product.image) }))} stores={vendors} />
            <Link href="/wishlist" className="icon-button" aria-label="Seçilmişlər" data-testid="link-wishlist"><Heart size={17} /></Link>
            <Link href="/seller" className="nav-seller" data-testid="link-seller-cta"><Store size={15} /><span><BrandWord />-də sat</span></Link>
            <Link href="/account" className="icon-button" aria-label="Hesab" data-testid="link-account"><UserRound size={17} /></Link>
            <Link href="/cart" className="icon-button cart-button" aria-label="Səbət" data-testid="link-cart"><ShoppingBag size={17} /><span className="cart-count">{cartCount}</span></Link>
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
        <div><h3>Müştəri üçün</h3><Link href="/wishlist">Seçilmişlər</Link><Link href="/account">Hesab</Link><Link href="/collection">Çatdırılma məlumatı</Link></div>
        <div><h3>Satıcılar üçün</h3><Link href="/seller"><BrandWord />-də sat</Link><a href="mailto:sat@eynek.com">Bizimlə əlaqə</a><a href="#support">Dəstək</a></div>
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
        <span className="product-label">{product.type}</span>
        <Link href={`/product/${product.id}`} data-testid={`link-product-${product.id}`}><h3 className="product-name">{product.name}</h3></Link>
        <span className="product-price">{money(product.price)}</span>
        <div className="product-meta"><Link href={`/vendor/${product.vendorSlug}`} className="product-vendor" data-testid={`link-vendor-${product.id}`}>{product.vendor} · Bakı</Link><span className="product-type">{product.material}</span></div>
      </div>
    </article>
  );
}

type CommonProps = { products: Product[]; likedIds: Set<number | string>; onFavorite: (id: number | string) => void; onQuickView: (product: Product) => void; onTryOn: (product: Product) => void };

function Home({ products, onQuickView, likedIds, onFavorite, onTryOn }: CommonProps) {
  const featured = ['6', '1', '5', '7']
    .map((id) => products.find((product) => String(product.id) === id))
    .filter((product): product is Product => Boolean(product));
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
                <button className="hero-preview-link" onClick={() => onTryOn(products[0])} data-testid="button-hero-tryon"><ScanFace size={16} /> Virtual sınaq</button>
              </div>
              <div className="hero-note"><Info size={14} /> Nümunə inventar · virtual sınaq demo görünüşüdür</div>
            </div>
          </div>
        </section>
        <section className="section home-discover"><div className="container"><div className="section-head"><div><div className="home-overline">Sənin üçün seçildi</div><h2 className="section-title">Eynəkləri kəşf et</h2></div><Link href="/collection" className="home-count" data-testid="link-view-all">{products.length} model <ArrowRight size={14} /></Link></div><div className="home-filter-pills" aria-label="Kateqoriyalar"><Link href="/collection" className="selected">Hamısı</Link><Link href="/collection?type=sunglasses">Gün eynəyi</Link><Link href="/collection?type=optical">Optik çərçivə</Link><Link href="/brands">Brendlər</Link></div><div className="product-grid">{(featured.length === 4 ? featured : products.slice(0, 4)).map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></div></section>
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
                <button className="btn btn-secondary" onClick={() => onTryOn(products[0])} data-testid="button-home-vto">VTO görünüşünü aç <Video size={14} /></button>
              </div>
              <div className="feature-card feature-card--light feature-card--store">
                <img className="feature-card-photo" src={`${import.meta.env.BASE_URL}feature-images/optical-store.webp`} alt="" loading="lazy" />
                <div className="eyebrow">Marketplace</div><h3>Optikaları bir-bir kəşf etmə.</h3><p>Mağazaları, satıcıları və onların real nümunə inventarını bir yerdə gör.</p>
                <Link className="btn" href="/stores" data-testid="link-feature-stores">Mağazalara bax <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
        </section>
        <section className="section" id="stores"><div className="container"><div className="section-head"><div><div className="eyebrow">Satıcılar</div><h2 className="section-title">Mağazalarla tanış ol.</h2></div><Link href="/stores" className="text-link" data-testid="link-home-stores">Bütün mağazalar <ArrowRight size={14} /></Link></div><div className="store-grid">{vendors.map((vendor) => <Link href={`/vendor/${vendor.slug}`} className="store-card" key={vendor.slug} data-testid={`card-home-store-${vendor.slug}`}><span className="store-mark">{vendor.initials}</span><span><h3>{vendor.name}</h3><p>{vendor.description}</p><span className="store-meta"><span>{vendor.location}</span><span>{vendor.count} model</span></span></span></Link>)}</div></div></section>
        <section className="section" style={{ paddingTop: 0 }}><div className="container seller-banner"><h2>Mağazanızı <span className="banner-brand-word"><BrandWord />-ə</span> gətirin.</h2><Link href="/seller" className="btn" data-testid="link-home-seller">Partnyor ol <ArrowRight size={14} /></Link></div></section>
      </main>
      <Footer />
    </>
  );
}

function Filters({ filters, setFilters, open }: { filters: { gender: string; material: string; type: string; maxPrice: number; size: string; seller: string }; setFilters: (filters: { gender: string; material: string; type: string; maxPrice: number; size: string; seller: string }) => void; open: boolean }) {
  const update = (key: keyof typeof filters, value: string | number) => setFilters({ ...filters, [key]: value });
  return (
    <aside className={`filter-panel ${open ? 'open' : ''}`}>
      <div className="filter-group"><div className="filter-title">Kateqoriya <ChevronDown size={14} /></div>{['Optik çərçivə', 'Gün eynəyi'].map((item) => <label className="check-row" key={item}><input type="radio" name="type" checked={filters.type === item} onChange={() => update('type', filters.type === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Satıcı <ChevronDown size={14} /></div>{vendors.map((vendor) => <label className="check-row" key={vendor.slug}><input type="radio" name="seller" checked={filters.seller === vendor.slug} onChange={() => update('seller', filters.seller === vendor.slug ? '' : vendor.slug)} />{vendor.name}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Cins <ChevronDown size={14} /></div>{genders.map((item) => <label className="check-row" key={item}><input type="radio" name="gender" checked={filters.gender === item} onChange={() => update('gender', filters.gender === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Material <ChevronDown size={14} /></div>{materials.map((item) => <label className="check-row" key={item}><input type="radio" name="material" checked={filters.material === item} onChange={() => update('material', filters.material === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Maksimum qiymət</div><input type="range" min="60" max="1000" step="10" value={filters.maxPrice} onChange={(event) => update('maxPrice', Number(event.target.value))} /><div className="range-labels"><span>60 AZN</span><span>{filters.maxPrice} AZN</span></div></div>
      <div className="filter-group"><div className="filter-title">Ölçü <ChevronDown size={14} /></div>{['S', 'M', 'L'].map((item) => <label className="check-row" key={item}><input type="radio" name="size" checked={filters.size === item} onChange={() => update('size', filters.size === item ? '' : item)} />{item} çərçivə</label>)}</div>
    </aside>
  );
}

function Collection({ products, likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const searchParam = params.get('q') ?? '';
  const [query, setQuery] = useState(searchParam);
  useEffect(() => setQuery(searchParam), [searchParam]);
  const [focused, setFocused] = useState(false);
  const [sort, setSort] = useState('Tövsiyə olunan');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ gender: '', material: '', type: '', maxPrice: 1000, size: '', seller: '' });
  const shape = params.get('shape') ?? '';
  const queryType = params.get('type');
  const filtered = useMemo(() => {
    const list = products.filter((product) => {
      const haystack = `${product.name} ${product.vendor} ${product.shape} ${product.color} ${product.type}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesShape = !shape || product.shape.toLowerCase() === shape.toLowerCase();
      const matchesType = filters.type ? product.type === filters.type : queryType === 'sunglasses' ? product.type === 'Gün eynəyi' : queryType === 'optical' ? product.type === 'Optik çərçivə' : true;
      return matchesQuery && matchesShape && matchesType && (!filters.size || product.size.startsWith(filters.size)) && (!filters.seller || product.vendorSlug === filters.seller) && (!filters.gender || product.gender === filters.gender) && (!filters.material || product.material === filters.material) && product.price <= filters.maxPrice;
    });
    if (sort === 'Qiymət: aşağıdan yuxarı') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Qiymət: yuxarıdan aşağı') return [...list].sort((a, b) => b.price - a.price);
    if (sort === 'Ada görə') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, filters, query, queryType, shape, sort]);
  const clearFilters = () => { setFilters({ gender: '', material: '', type: '', maxPrice: 1000, size: '', seller: '' }); setQuery(''); setLocation('/collection'); };
  const suggestion = (value: string) => { setQuery(value); setFocused(false); };
  return (
    <>
      <main className="collection-page"><div className="container">
        <div className="collection-intro"><div><div className="eyebrow">Shop · inkişaf datası</div><h1>Eynəyini<br />burada tap.</h1></div><p>Azərbaycandakı nümunə inventarını marka, model, forma, satıcı və ölçü ilə axtar.</p></div>
        <div className="collection-tools"><div className="search-box"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} placeholder="Eynək, marka və ya model axtar..." data-testid="input-search-products" />{focused && <div className="search-suggestions"><h4>Tez axtarış</h4><div className="suggestion-row"><button onClick={() => suggestion('Gün eynəyi')} data-testid="button-suggestion-sunglasses">Gün eynəyi</button><button onClick={() => suggestion('Aviator')} data-testid="button-suggestion-aviator">Aviator</button><button onClick={() => suggestion('Optika')} data-testid="button-suggestion-optika">Optika</button></div><h4 style={{ marginTop: 16 }}>Formalar</h4><div className="suggestion-row">{shapes.slice(0, 4).map((item) => <button key={item} onClick={() => suggestion(item)}>{item}</button>)}</div></div>}</div><button className="btn btn-secondary filter-toggle" onClick={() => setFilterOpen(!filterOpen)} data-testid="button-toggle-filters"><SlidersHorizontal size={14} /> Filtrlər</button><select className="select-control" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sıralama" data-testid="select-sort"><option>Tövsiyə olunan</option><option>Qiymət: aşağıdan yuxarı</option><option>Qiymət: yuxarıdan aşağı</option><option>Ada görə</option></select></div>
        <div className="catalog-layout"><Filters filters={filters} setFilters={setFilters} open={filterOpen} /><section><div className="catalog-head"><span><strong>{filtered.length}</strong> model</span><button className="text-link" onClick={clearFilters} data-testid="button-clear-filters">Təmizlə <X size={12} /></button></div><div className="product-grid">{filtered.length ? filtered.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />) : <div className="empty-state"><Search size={22} /><h3>Bu axtarışa uyğun eynək tapılmadı.</h3><p>Axtarışı və ya filtrləri bir az yumşalt.</p><button className="btn btn-secondary" onClick={clearFilters} data-testid="button-empty-reset">Filtrləri sıfırla</button></div>}</div></section></div>
      </div></main><Footer />
    </>
  );
}

function StoresPage() {
  return <><main className="directory-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Marketplace satıcıları</div><h1>Mağazalar.</h1></div><p><BrandWord /> tək mağaza deyil. Azərbaycandakı nümunə inventarı ilə mağazaları və onların seçimlərini bir yerdə kəşf et.</p></div><div className="store-grid">{vendors.map((vendor) => <Link href={`/vendor/${vendor.slug}`} className="store-card" key={vendor.slug} data-testid={`card-store-${vendor.slug}`}><span className="store-mark">{vendor.initials}</span><span><h3>{vendor.name}</h3><p>{vendor.description}</p><span className="store-meta"><span><MapPin size={12} /> {vendor.location}</span><span>{vendor.count} model</span></span></span><span className="text-link">Mağazaya bax <ArrowRight size={13} /></span></Link>)}</div></div></main><Footer /></>;
}

function BrandsPage({ products, likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  return <><main className="directory-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Brend kəşfi</div><h1>Brendlər.</h1></div><p>Brend kataloqu yalnız satıcı datasında brend adı olduqda göstərilir. Hazırkı nümunə inventarında bu sahə qeyd olunmayıb.</p></div><div className="account-panel"><Info size={17} /><h2>İnkişaf datası haqqında</h2><p>Bu versiyada brend adları məhsul məlumatına ayrıca əlavə edilməyib. <BrandWord /> yanlış brend adı göstərmir; satıcı datası tamamlandıqda bu səhifə real brendlərlə yenilənəcək.</p><Link href="/collection" className="btn btn-secondary" data-testid="link-brands-inventory">Mövcud modellərə bax <ArrowRight size={14} /></Link></div><section className="section" style={{ paddingBottom: 0 }}><div className="section-head"><div><div className="eyebrow">Mövcud inventar</div><h2 className="section-title">Model adları ilə axtar.</h2></div></div><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></section></div></main><Footer /></>;
}

function VendorPage({ products, likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const { slug = '' } = useParams<{ slug: string }>();
  const vendor = vendors.find((item) => item.slug === slug) ?? vendors[0];
  const items = products.filter((product) => product.vendorSlug === vendor.slug);
  return <><main className="vendor-page"><div className="container"><div className="vendor-hero"><div><div className="eyebrow" style={{ color: '#B7B9C9' }}><BrandWord /> satıcısı</div><h1>{vendor.name}</h1><p>{vendor.description}</p></div><Link href="/stores" className="btn btn-secondary" data-testid="link-vendor-back">Bütün mağazalar</Link></div><div className="vendor-details"><span><MapPin size={14} /> {vendor.location}</span><span>{vendor.since}</span><span><ShoppingBag size={14} /> {vendor.count} model</span></div><section className="section" style={{ padding: '45px 0 0' }}><div className="section-head"><div><div className="eyebrow">Mağaza seçimi</div><h2 className="section-title">Bu vitrində</h2></div></div><div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></section></div></main><Footer /></>;
}

function ProductDetail({ products, onAdd, onTryOn, onQuickView, onFavorite, likedIds }: { products: Product[]; onAdd: (product: Product, message?: string, quantity?: number) => void; onTryOn: (product: Product) => void; onQuickView: (product: Product) => void; onFavorite: (id: number | string) => void; likedIds: Set<number | string> }) {
  const { id = '1' } = useParams<{ id: string }>();
  const product = products.find((item) => String(item.id) === id) ?? products[0];
  const [quantity, setQuantity] = useState(1);
  const [showSide, setShowSide] = useState(false);
  useEffect(() => {
    setQuantity(1);
    setShowSide(false);
  }, [id]);
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
    "offers": { "@type": "Offer", "priceCurrency": "AZN", "price": product.price, "availability": "https://schema.org/InStock" }
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
              <span className="seller-avatar">{vendors.find((vendor) => vendor.slug === product.vendorSlug)?.initials || 'S'}</span>
              <span><strong>{product.vendor}</strong><small>Satıcının vitrininə bax · Bakı</small></span>
              <ArrowRight size={16} />
            </Link>
            <div className="detail-options">
              <div className="detail-option"><div className="detail-option-label">ÇƏRÇİVƏ ÖLÇÜSÜ</div><div className="detail-size-row"><span className="detail-size-selected">{sizeLetter}</span><span className="detail-option-note">{product.size} · mövcud ölçü</span></div></div>
              <div className="detail-option"><div className="detail-option-label">RƏNG</div><div className="detail-color-row"><span className="detail-color-swatch" style={{ background: swatchColor }} aria-hidden="true" /><span>{product.color}</span></div></div>
            </div>
            <div className="detail-quantity"><div><div className="detail-option-label">SAY</div><small>Nümunə inventar · ödəniş hazır deyil</small></div><div className="quantity-stepper"><button onClick={() => setQuantity((count) => Math.max(1, count - 1))} aria-label="Sayı azalt">−</button><span aria-live="polite">{quantity}</span><button onClick={() => setQuantity((count) => Math.min(10, count + 1))} aria-label="Sayı artır">+</button></div></div>
            <div className="detail-purchase"><button className={`detail-favorite ${likedIds.has(product.id) ? 'liked' : ''}`} onClick={() => onFavorite(product.id)} aria-label="Seçilmişlərə əlavə et" data-testid="button-detail-favorite"><Heart size={19} fill={likedIds.has(product.id) ? 'currentColor' : 'none'} /></button><button className="detail-add" onClick={() => onAdd(product, `${quantity} ədəd ${product.name} səbətə əlavə edildi`, quantity)} data-testid="button-add-cart-detail"><ShoppingBag size={17} /> Səbətə əlavə et · {money(product.price * quantity)}</button></div>
            <p className="detail-disclaimer">Sifariş və ödəniş mərhələsi hazırlanır. Bu məhsullar nümunə inventardır.</p>
          </div>
        </div>
        <section className="detail-related"><div className="section-head"><h2>Digər modellər</h2><Link href="/collection" className="home-count">Hamısına bax <ArrowRight size={14} /></Link></div><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} liked={likedIds.has(item.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></section>
      </div>
    </main>
    <Footer />
  </>;
}

function QuickView({ product, onClose, onAdd, onTryOn }: { product: Product; onClose: () => void; onAdd: (product: Product, message?: string) => void; onTryOn: (product: Product) => void }) {
  return <div className="tryon-backdrop" role="dialog" aria-modal="true" aria-label="Sürətli məhsul baxışı" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="tryon-modal quick-view-modal"><div className="tryon-top" style={{ borderBottom: '1px solid var(--line)', color: 'var(--navy)' }}><div><div className="eyebrow">{product.type}</div><h2>{product.name}</h2><p style={{ color: 'var(--muted)' }}>{product.vendor} · Bakı</p></div><button className="icon-button" onClick={onClose} aria-label="Baxışı bağla" data-testid="button-close-quick-view"><X size={19} /></button></div><div className="quick-view-layout"><div className={`detail-art quick-view-art ${product.tone}`}><img className="detail-photo" src={product.image.startsWith('data:') || product.image.startsWith('http') ? product.image : assetUrl(product.image)} alt={`${product.name} məhsul fotosu`} /></div><div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><div className="detail-price" style={{ marginTop: 0 }}>{money(product.price)}</div><p className="detail-copy">{product.description}</p><div className="spec-list" style={{ margin: '8px 0 17px' }}><div><dt>Forma</dt><dd>{product.shape}</dd></div><div><dt>Ölçü</dt><dd>{product.size}</dd></div></div><button className="btn btn-full" onClick={() => onAdd(product)} data-testid="button-add-cart-quick-view"><ShoppingBag size={14} /> Səbətə əlavə et</button><button className="try-link" onClick={() => onTryOn(product)} data-testid="button-try-on-quick-view"><ScanFace size={14} /> Üzümdə yoxla</button></div></div></div></div>;
}

function VirtualTryOn({ products, product, onClose, onSelect, onAdd, onSave }: { products: Product[]; product: Product; onClose: () => void; onSelect: (product: Product) => void; onAdd: (product: Product, message?: string) => void; onSave: (id: number | string) => void }) {
  const options = products.slice(0, 6);
  return <div className="tryon-backdrop" role="dialog" aria-modal="true" aria-label="Üzümdə yoxla"><div className="tryon-modal"><div className="tryon-top"><div><div className="eyebrow" style={{ color: '#B7B9C9' }}>VTO inteqrasiya sərhədi</div><h2>Üzümdə yoxla</h2><p>Provayder qoşulana qədər məhsul önizləməsi</p></div><button className="icon-button close-light" onClick={onClose} aria-label="VTO pəncərəsini bağla" data-testid="button-close-tryon"><X size={20} /></button></div><div className="camera-stage"><div className="provider-state"><Camera size={16} /><span>Kamera icazəsi və VTO provayderi gözlənilir</span></div><div className="preview-product"><FrameVisual shape={product.shape} frameStyle={product.frameStyle} sunglasses={product.type === 'Gün eynəyi'} /><div className="preview-caption">{product.name} · məhsul çərçivəsi önizləməsi</div></div></div><div className="tryon-bottom"><p>Çərçivəni dəyiş</p><div className="frame-switcher">{options.map((option) => <button key={option.id} className={`frame-choice ${option.id === product.id ? 'active' : ''}`} onClick={() => onSelect(option)} aria-label={`${option.name} modelini önizlə`} data-testid={`button-tryon-frame-${option.id}`}><FrameVisual shape={option.shape} frameStyle={option.frameStyle} /><small>{option.name}</small></button>)}</div><div className="tryon-actions"><button className="btn btn-secondary" onClick={() => onSave(product.id)} data-testid="button-save-tryon"><Heart size={14} /> Yadda saxla</button><button className="btn btn-blue" onClick={() => onAdd(product, 'Model səbətə əlavə edildi')} data-testid="button-add-cart-tryon"><ShoppingBag size={14} /> Səbətə əlavə et</button></div></div></div></div>;
}

type SellerForm = { storeName: string; owner: string; phone: string; email: string; business: string; tax: string; address: string; instagram: string; website: string; categories: string };
const initialSellerForm: SellerForm = { storeName: '', owner: '', phone: '', email: '', business: '', tax: '', address: '', instagram: '', website: '', categories: '' };

function SellerPage() {
  const [form, setForm] = useState<SellerForm>(initialSellerForm);
  const [errors, setErrors] = useState<Partial<Record<keyof SellerForm, string>>>({});
  const [sent, setSent] = useState(false);
  const update = (key: keyof SellerForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Partial<Record<keyof SellerForm, string>> = {};
    (['storeName', 'owner', 'phone', 'email', 'business', 'address', 'categories'] as const).forEach((key) => { if (!form[key].trim()) next[key] = 'Bu sahə tələb olunur.'; });
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Düzgün e-poçt ünvanı yazın.';
    setErrors(next);
    if (!Object.keys(next).length) setSent(true);
  };
  const field = (key: keyof SellerForm, label: string, required = false, type = 'text') => <div className="field"><label htmlFor={`seller-${key}`}>{label}{required ? ' *' : ''}</label><input id={`seller-${key}`} type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} aria-invalid={Boolean(errors[key])} data-testid={`input-seller-${key}`} />{errors[key] && <span className="field-error">{errors[key]}</span>}</div>;
  return <><main className="seller-page"><div className="container form-shell"><div className="seller-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-start', maxWidth: '100%' }}><div style={{ maxWidth: '700px' }}><div className="eyebrow">Satıcı onboarding</div><h1><BrandWord />-də sat.</h1><p>Mağazanızı <BrandWord />-ə qoşun və məhsullarınızı Azərbaycanda daha çox müştəriyə çatdırın. Müraciət göndərildikdən sonra məlumatlar komanda tərəfindən nəzərdən keçirilir.</p></div><Link href="/seller-login" className="btn btn-secondary" data-testid="link-seller-login">Mövcud satıcı? Daxil ol</Link></div>{sent ? <div className="form-success" data-testid="status-seller-application"><strong>Müraciət qəbul edildi.</strong><br />Məlumatlarınız nəzərdən keçirilmək üçün göndərildi. Status: Gözləmədə.</div> : <form className="seller-form" onSubmit={submit} noValidate>{field('storeName', 'Mağaza adı', true)}{field('owner', 'Məsul şəxs', true)}{field('phone', 'Telefon', true, 'tel')}{field('email', 'E-poçt', true, 'email')}<div className="field full"><label htmlFor="seller-business">Biznes haqqında *</label><textarea id="seller-business" value={form.business} onChange={(event) => update('business', event.target.value)} aria-invalid={Boolean(errors.business)} data-testid="input-seller-business" />{errors.business && <span className="field-error">{errors.business}</span>}</div>{field('tax', 'VÖEN (əgər varsa)')}{field('address', 'Mağaza ünvanı', true)}{field('instagram', 'Instagram')}{field('website', 'Veb-sayt')}{field('categories', 'Məhsul kateqoriyaları', true)}<div className="field full"><span className="field-help">Müraciət zamanı mağaza şəkilləri və tələb olunan sənədlər növbəti mərhələdə komanda tərəfindən istənilə bilər.</span></div><div className="form-actions"><button className="btn" type="submit" data-testid="button-submit-seller">Müraciəti göndər <ArrowRight size={14} /></button><span className="field-help">* məcburi sahələr</span></div></form>}</div></main><Footer /></>;
}

function WishlistPage({ products, likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const items = products.filter((product) => likedIds.has(product.id));
  return <><main className="collection-page"><div className="container"><div className="collection-intro"><div><div className="eyebrow">Seçilmişlər</div><h1>Saxladığın<br />modellər.</h1></div><p>Qonaq seçilmişləri bu brauzerdə saxlanılır. Modelə bax, VTO önizləməsini aç və ya seçimini sil.</p></div><div className="product-grid wishlist-grid">{items.length ? items.map((product) => <ProductCard key={product.id} product={product} liked onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />) : <div className="empty-state"><Heart size={22} /><h3>Hələ seçilmiş model yoxdur.</h3><p>Bəyəndiyin çərçivələrdə ürək işarəsinə toxun.</p><Link href="/collection" className="btn btn-secondary" data-testid="link-empty-wishlist">Eynəklərə bax</Link></div>}</div></div></main><Footer /></>;
}

function CartPage({ items, onRemove, onCheckout }: { items: Product[]; onRemove: (id: number | string) => void; onCheckout: () => void }) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const grouped = vendors.map((vendor) => ({ vendor, items: items.filter((item) => item.vendorSlug === vendor.slug) })).filter((group) => group.items.length);
  return <><main className="cart-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Səbət</div><h1>Sifarişin.</h1></div><p>Marketplace səbətində məhsullar satıcıya görə qruplaşdırılır.</p></div>{items.length ? <div className="cart-panel"><h2>{items.length} məhsul</h2>{grouped.map((group) => <div className="cart-items" key={group.vendor.slug}><div className="eyebrow">{group.vendor.name}</div>{group.items.map((item) => <div className="cart-row" key={`${item.id}-${group.vendor.slug}`}><span><strong>{item.name}</strong><small>{money(item.price)} · {item.size}</small></span><button className="icon-button" onClick={() => onRemove(item.id)} aria-label={`${item.name} sil`} data-testid={`button-remove-cart-${item.id}`}><Trash2 size={15} /></button></div>)}</div>)}<div className="cart-row"><strong>Cəmi</strong><strong>{money(total)}</strong></div><button className="btn" onClick={onCheckout} data-testid="button-checkout">Sifarişə keç <ArrowRight size={14} /></button></div> : <div className="empty-state"><ShoppingBag size={22} /><h3>Səbətin hələ boşdur.</h3><p>Məhsulları bir neçə satıcıdan seçib burada toplaya bilərsən.</p><Link href="/collection" className="btn btn-secondary" data-testid="link-empty-cart">Eynəklərə bax</Link></div>}</div></main><Footer /></>;
}

function AccountPage() {
  return <><main className="account-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Müştəri hesabı</div><h1>Hesabın.</h1></div><p>Qonaq rejimində seçilmişlər və səbət bu brauzerdə işləyir. Hesab inteqrasiyası növbəti mərhələ üçün hazırlaşdırılır.</p></div><div className="account-panel"><UserRound size={20} /><h2><BrandWord /> hesabı</h2><p>Sifarişləri, ünvanları və bildirişləri bir yerdən idarə etmək üçün hesab yaratma axını burada yerləşəcək.</p><Link href="/wishlist" className="btn btn-secondary" data-testid="link-account-wishlist">Seçilmişlərə bax <ArrowRight size={14} /></Link></div></div></main><Footer /></>;
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
  const [location] = useLocation();
  const { data: sellerProductsData = [] } = useListProducts();

  const allProducts = useMemo(() => {
    const activeSellerProducts = sellerProductsData
      .filter(p => p.status === 'Aktiv')
      .map((p): Product => ({
        id: p.id,
        name: p.name,
        image: p.frontImage,
        sideImage: p.sideImage,
        vendor: 'Nümunə Optika', // Demo static name or fetch from session
        vendorSlug: 'numune-optika',
        price: p.price,
        type: p.category,
        gender: 'Uniseks',
        shape: 'Square', // Default shape for demo
        material: p.material,
        size: 'M (50–20)',
        color: p.color,
        tone: 'tone-1',
        frameStyle: p.category === 'Gün eynəyi' ? 'sunglass' : 'clear',
        description: 'Satıcı paneli vasitəsilə əlavə edilmiş demo məhsul.',
      }));
    return [...defaultProducts, ...activeSellerProducts];
  }, [sellerProductsData]);

  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number | string>>(new Set());
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenu(false), []);
  useEffect(() => { closeMobileMenu(); }, [location, closeMobileMenu]);
  const cartCount = cartItems.length;
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2300); };
  const toggleFavorite = (id: number | string) => { setLikedIds((current) => { const next = new Set(current); if (next.has(id)) { next.delete(id); showToast('Seçilmişlərdən çıxarıldı'); } else { next.add(id); showToast('Seçilmişlərə əlavə edildi'); } return next; }); };
  const addToCart = (product: Product, message = `${product.name} səbətə əlavə edildi`, quantity = 1) => { setCartItems((current) => [...current, ...Array.from({ length: Math.min(10, Math.max(1, quantity)) }, () => product)]); setQuickProduct(null); setTryOnProduct(null); showToast(message); };
  const removeFromCart = (id: number | string) => setCartItems((current) => { const index = current.findIndex((item) => item.id === id); return index === -1 ? current : current.filter((_, itemIndex) => itemIndex !== index); });
  const common: CommonProps = { products: allProducts, likedIds, onFavorite: toggleFavorite, onQuickView: (product: Product) => setQuickProduct(product), onTryOn: (product: Product) => setTryOnProduct(product) };
  return <div className="app-shell"><Header cartCount={cartCount} products={allProducts} menuOpen={mobileMenu} onMenu={() => setMobileMenu((open) => !open)} />{mobileMenu && <MobileDrawer onClose={closeMobileMenu} />}<Switch><Route path="/collection"><Collection {...common} /></Route><Route path="/stores"><StoresPage /></Route><Route path="/brands"><BrandsPage {...common} /></Route><Route path="/seller"><SellerPage /></Route><Route path="/wishlist"><WishlistPage {...common} /></Route><Route path="/cart"><CartPage items={cartItems} onRemove={removeFromCart} onCheckout={() => showToast('Ödəniş mərhələsi hazırlanır')} /></Route><Route path="/account"><AccountPage /></Route><Route path="/vendor/:slug"><VendorPage {...common} /></Route><Route path="/product/:id"><ProductDetail products={allProducts} onAdd={addToCart} onTryOn={setTryOnProduct} onQuickView={setQuickProduct} onFavorite={toggleFavorite} likedIds={likedIds} /></Route><Route path="/"><Home {...common} /></Route><Route component={NotFound} /></Switch><MobileBottomNav onTryOn={() => setTryOnProduct(allProducts[0])} />{quickProduct && <QuickView product={quickProduct} onClose={() => setQuickProduct(null)} onAdd={addToCart} onTryOn={setTryOnProduct} />}{tryOnProduct && <VirtualTryOn products={allProducts} product={tryOnProduct} onClose={() => setTryOnProduct(null)} onSelect={setTryOnProduct} onAdd={addToCart} onSave={toggleFavorite} />}{toast && <div className="toast" role="status" data-testid="status-toast"><Check size={16} /><span>{toast}</span></div>}</div>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Switch><Route path="/seller-login"><SellerLogin /></Route><Route path="/seller-panel"><SellerPanel /></Route><Route path="/seller-panel/*"><SellerPanel /></Route><Route><Storefront /></Route></Switch></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;