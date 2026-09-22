import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
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
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type Product = {
  id: number;
  name: string;
  image: string;
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

const products: Product[] = [
  { id: 1, name: 'Mimoza 02', image: 'product-images/mimoza-02.jpg', vendor: 'Optika Nərgiz', vendorSlug: 'optika-nergiz', price: 118, type: 'Optik çərçivə', gender: 'Qadın', shape: 'Cat-Eye', material: 'Asetat', size: 'M (52–18)', color: 'Kərpic / şampan', tone: 'tone-1', frameStyle: 'coral', description: 'Yumşaq cat-eye xətti və isti kərpic tonu ilə gündəlik görünüşə sakit xarakter verir.' },
  { id: 2, name: 'Sahil 11', image: 'product-images/sahil-11.jpg', vendor: 'Bakı Optik', vendorSlug: 'baki-optik', price: 145, type: 'Gün eynəyi', gender: 'Uniseks', shape: 'Wayfarer', material: 'Asetat', size: 'L (55–19)', color: 'Zeytun', tone: 'tone-2', frameStyle: 'olive', description: 'Günəşli Bakı günləri üçün dərin zeytun asetat və polarizə linza.' },
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

function Header({ cartCount, onMenu }: { cartCount: number; onMenu: () => void }) {
  const [location] = useLocation();
  return (
    <>
      <div className="announcement"><strong>EYNƏK</strong>&nbsp; — Azərbaycanda müxtəlif optikaları bir yerdə kəşf et</div>
      <header className="topbar">
        <div className="container nav">
          <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Menyunu aç" data-testid="button-menu"><Menu size={19} /></button>
          <Link href="/" className="brand" data-testid="link-brand"><span className="brand-word">EYNƏK<span className="brand-dot">.</span>com</span></Link>
          <nav className="nav-links" aria-label="Əsas menyu">
            <Link href="/collection" className={location.startsWith('/collection') ? 'active' : ''} data-testid="link-collection">Eynəklər</Link>
            <Link href="/collection?type=sunglasses" data-testid="link-sunglasses">Gün eynəkləri</Link>
            <Link href="/brands" className={location.startsWith('/brands') ? 'active' : ''} data-testid="link-brands">Brendlər</Link>
            <Link href="/stores" className={location.startsWith('/stores') ? 'active' : ''} data-testid="link-stores">Mağazalar</Link>
          </nav>
          <div className="nav-actions">
            <Link href="/collection" className="icon-button" aria-label="Axtarış" data-testid="link-search"><Search size={17} /></Link>
            <Link href="/wishlist" className="icon-button" aria-label="Seçilmişlər" data-testid="link-wishlist"><Heart size={17} /></Link>
            <Link href="/seller" className="nav-seller" data-testid="link-seller-cta">EYNƏK-də sat</Link>
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
        <div><div className="brand"><span className="brand-word">EYNƏK<span className="brand-dot">.</span>com</span></div><p>Bütün eynəklər. Bir marketplace. Azərbaycandakı optikaları və çərçivələri bir yerdə kəşf et.</p></div>
        <div><h3>Kəşf et</h3><Link href="/collection">Eynəklər</Link><Link href="/brands">Brendlər</Link><Link href="/stores">Mağazalar</Link></div>
        <div><h3>Müştəri üçün</h3><Link href="/wishlist">Seçilmişlər</Link><Link href="/account">Hesab</Link><Link href="/collection">Çatdırılma məlumatı</Link></div>
        <div><h3>Satıcılar üçün</h3><Link href="/seller">EYNƏK-də sat</Link><a href="mailto:sat@eynek.com">Bizimlə əlaqə</a><a href="#support">Dəstək</a></div>
      </div>
      <div className="container footer-bottom"><span>© 2024 EYNƏK</span><span>Bakı • Azərbaycan</span></div>
    </footer>
  );
}

function ProductCard({ product, liked, onFavorite, onQuickView, onTryOn }: { product: Product; liked: boolean; onFavorite: (id: number) => void; onQuickView: (product: Product) => void; onTryOn: (product: Product) => void }) {
  return (
    <article className="product-card" data-testid={`card-product-${product.id}`}>
      <div className={`product-image ${product.tone}`}>
        <img className="product-photo" src={assetUrl(product.image)} alt={`${product.name} — ${product.color} eynək modeli`} loading="lazy" />
        <button className={`heart-button ${liked ? 'liked' : ''}`} onClick={() => onFavorite(product.id)} aria-label={`${product.name} seçilmişlərə əlavə et`} data-testid={`button-favorite-${product.id}`}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /></button>
        <button className="btn btn-secondary quick-view" onClick={() => onQuickView(product)} data-testid={`button-quick-view-${product.id}`}>Sürətli baxış <ArrowRight size={13} /></button>
        <button className="btn try-card" onClick={() => onTryOn(product)} data-testid={`button-try-on-${product.id}`}>Üzümdə yoxla</button>
      </div>
      <div className="product-info">
        <Link href={`/vendor/${product.vendorSlug}`} className="product-vendor" data-testid={`link-vendor-${product.id}`}>{product.vendor} · Bakı</Link>
        <Link href={`/product/${product.id}`} data-testid={`link-product-${product.id}`}><h3 className="product-name">{product.name}</h3></Link>
        <div className="product-meta"><span className="product-price">{money(product.price)}</span><span className="product-type">{product.type}</span></div>
      </div>
    </article>
  );
}

type CommonProps = { likedIds: Set<number>; onFavorite: (id: number) => void; onQuickView: (product: Product) => void; onTryOn: (product: Product) => void };

function Home({ onQuickView, likedIds, onFavorite, onTryOn }: CommonProps) {
  return (
    <>
      <main>
        <section className="hero"><div className="container hero-grid"><div><div className="eyebrow">EYNƏK marketplace · Azərbaycan</div><h1>Üzünə uyğun eynəyi tap.</h1><p className="hero-sub">Azərbaycandakı müxtəlif optikaların və satıcıların eynəklərini bir yerdə kəşf et. Almazdan əvvəl ölçünü və modeli müqayisə et.</p><div className="hero-actions"><Link href="/collection" className="btn" data-testid="link-hero-collection">Eynəklərə bax <ArrowRight size={15} /></Link><button className="btn btn-secondary" onClick={() => onTryOn(products[0])} data-testid="button-hero-tryon">Üzümdə yoxla <ScanFace size={15} /></button></div><div className="hero-note"><Info size={15} /> Nümunə inventar: inkişaf datası</div></div><div className="hero-art" aria-label="Eynək məhsulu üçün redaksiya vizualı"><div className="hero-art-back" /><div className="hero-art-photo" /><div className="hero-glasses"><span className="hero-lens" /><span className="hero-bridge" /><span className="hero-lens" /></div><div className="art-sticker">Bütün<br />eynəklər.<br />Bir marketplace.</div><div className="hero-caption">01 / EYNƏK seçimləri</div></div></div></section>
        <div className="strip"><div className="container strip-inner"><div className="strip-item"><Store size={15} /> Yerli optikaları kəşf et</div><div className="strip-item"><ShoppingBag size={15} /> Sifarişi EYNƏK-də tamamla</div><div className="strip-item"><ScanFace size={15} /> VTO provayderinə hazır UX</div></div></div>
        <section className="section"><div className="container"><div className="section-head"><div><div className="eyebrow">Kateqoriyalar</div><h2 className="section-title">Nə axtarırsan?</h2></div><p className="section-copy">Gündəlik optik çərçivələr və günəşli Bakı üçün gün eynəkləri.</p></div><div className="feature-layout"><Link href="/collection?type=sunglasses" className="feature-card" data-testid="link-category-sunglasses"><div className="eyebrow" style={{ color: '#B7B9C9' }}>Kateqoriya 01</div><h3>Gün eynəkləri</h3><p>Formanı, ölçünü və satıcını müqayisə et.</p><div className="mini-frame"><div className="shape-glasses"><i /><i /></div></div></Link><Link href="/collection?type=optical" className="feature-card" data-testid="link-category-optical"><div className="eyebrow">Kateqoriya 02</div><h3>Optik çərçivələr</h3><p>Gündəlik istifadə üçün modelləri kəşf et.</p><div className="mini-frame"><div className="shape-glasses"><i /><i /></div></div></Link></div></div></section>
        <section className="section" style={{ paddingTop: 0 }}><div className="container"><div className="section-head"><div><div className="eyebrow">Seçilmiş modellər</div><h2 className="section-title">Sənin seçimin.</h2></div><Link href="/collection" className="text-link" data-testid="link-view-all">Hamısına bax <ArrowRight size={14} /></Link></div><div className="product-grid">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></div></section>
        <section className="section" style={{ paddingTop: 0 }}><div className="container"><div className="feature-layout"><div className="feature-card"><div className="eyebrow" style={{ color: '#B7B9C9' }}>Virtual try-on</div><h3>Almazdan əvvəl üzündə yoxla.</h3><p>Bu interfeys gələcək VTO provayderinə qoşulmaq üçün hazırlanıb. Hazırda kamera və üz izləmə aktiv deyil.</p><button className="btn btn-secondary" onClick={() => onTryOn(products[0])} data-testid="button-home-vto">VTO görünüşünü aç <Video size={14} /></button><div className="mini-frame"><div className="shape-glasses"><i /><i /></div></div></div><div className="feature-card"><div className="eyebrow">Marketplace</div><h3>Optikaları bir-bir kəşf etmə.</h3><p>Mağazaları, satıcıları və onların real nümunə inventarını bir yerdə gör.</p><Link className="btn" href="/stores" data-testid="link-feature-stores">Mağazalara bax <ArrowRight size={14} /></Link></div></div></div></section>
        <section className="section" id="stores"><div className="container"><div className="section-head"><div><div className="eyebrow">Satıcılar</div><h2 className="section-title">Mağazalarla tanış ol.</h2></div><Link href="/stores" className="text-link" data-testid="link-home-stores">Bütün mağazalar <ArrowRight size={14} /></Link></div><div className="store-grid">{vendors.map((vendor) => <Link href={`/vendor/${vendor.slug}`} className="store-card" key={vendor.slug} data-testid={`card-home-store-${vendor.slug}`}><span className="store-mark">{vendor.initials}</span><span><h3>{vendor.name}</h3><p>{vendor.description}</p><span className="store-meta"><span>{vendor.location}</span><span>{vendor.count} model</span></span></span></Link>)}</div></div></section>
        <section className="section" style={{ paddingTop: 0 }}><div className="container seller-banner"><div><div className="eyebrow">Marketplace-ə qoşul</div><h2>Mağazanızı EYNƏK-ə gətirin.</h2></div><Link href="/seller" className="btn" data-testid="link-home-seller">EYNƏK-də sat <ArrowRight size={14} /></Link></div></section>
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
      <div className="filter-group"><div className="filter-title">Maksimum qiymət</div><input type="range" min="60" max="180" step="1" value={filters.maxPrice} onChange={(event) => update('maxPrice', Number(event.target.value))} /><div className="range-labels"><span>60 AZN</span><span>{filters.maxPrice} AZN</span></div></div>
      <div className="filter-group"><div className="filter-title">Ölçü <ChevronDown size={14} /></div>{['S', 'M', 'L'].map((item) => <label className="check-row" key={item}><input type="radio" name="size" checked={filters.size === item} onChange={() => update('size', filters.size === item ? '' : item)} />{item} çərçivə</label>)}</div>
    </aside>
  );
}

function Collection({ likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] ?? '');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [sort, setSort] = useState('Tövsiyə olunan');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ gender: '', material: '', type: '', maxPrice: 180, size: '', seller: '' });
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
  }, [filters, query, queryType, shape, sort]);
  const clearFilters = () => { setFilters({ gender: '', material: '', type: '', maxPrice: 180, size: '', seller: '' }); setQuery(''); setLocation('/collection'); };
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
  return <><main className="directory-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Marketplace satıcıları</div><h1>Mağazalar.</h1></div><p>EYNƏK tək mağaza deyil. Azərbaycandakı nümunə inventarı ilə mağazaları və onların seçimlərini bir yerdə kəşf et.</p></div><div className="store-grid">{vendors.map((vendor) => <Link href={`/vendor/${vendor.slug}`} className="store-card" key={vendor.slug} data-testid={`card-store-${vendor.slug}`}><span className="store-mark">{vendor.initials}</span><span><h3>{vendor.name}</h3><p>{vendor.description}</p><span className="store-meta"><span><MapPin size={12} /> {vendor.location}</span><span>{vendor.count} model</span></span></span><span className="text-link">Mağazaya bax <ArrowRight size={13} /></span></Link>)}</div></div></main><Footer /></>;
}

function BrandsPage({ likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  return <><main className="directory-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Brend kəşfi</div><h1>Brendlər.</h1></div><p>Brend kataloqu yalnız satıcı datasında brend adı olduqda göstərilir. Hazırkı nümunə inventarında bu sahə qeyd olunmayıb.</p></div><div className="account-panel"><Info size={17} /><h2>İnkişaf datası haqqında</h2><p>Bu versiyada brend adları məhsul məlumatına ayrıca əlavə edilməyib. EYNƏK yanlış brend adı göstərmir; satıcı datası tamamlandıqda bu səhifə real brendlərlə yenilənəcək.</p><Link href="/collection" className="btn btn-secondary" data-testid="link-brands-inventory">Mövcud modellərə bax <ArrowRight size={14} /></Link></div><section className="section" style={{ paddingBottom: 0 }}><div className="section-head"><div><div className="eyebrow">Mövcud inventar</div><h2 className="section-title">Model adları ilə axtar.</h2></div></div><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></section></div></main><Footer /></>;
}

function VendorPage({ likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const { slug = '' } = useParams<{ slug: string }>();
  const vendor = vendors.find((item) => item.slug === slug) ?? vendors[0];
  const items = products.filter((product) => product.vendorSlug === vendor.slug);
  return <><main className="vendor-page"><div className="container"><div className="vendor-hero"><div><div className="eyebrow" style={{ color: '#B7B9C9' }}>EYNƏK satıcısı</div><h1>{vendor.name}</h1><p>{vendor.description}</p></div><Link href="/stores" className="btn btn-secondary" data-testid="link-vendor-back">Bütün mağazalar</Link></div><div className="vendor-details"><span><MapPin size={14} /> {vendor.location}</span><span>{vendor.since}</span><span><ShoppingBag size={14} /> {vendor.count} model</span></div><section className="section" style={{ padding: '45px 0 0' }}><div className="section-head"><div><div className="eyebrow">Mağaza seçimi</div><h2 className="section-title">Bu vitrində</h2></div></div><div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />)}</div></section></div></main><Footer /></>;
}

function ProductDetail({ onAdd, onTryOn, onQuickView, onFavorite, likedIds }: { onAdd: (product: Product, message?: string) => void; onTryOn: (product: Product) => void; onQuickView: (product: Product) => void; onFavorite: (id: number) => void; likedIds: Set<number> }) {
  const { id = '1' } = useParams<{ id: string }>();
  const product = products.find((item) => item.id === Number(id)) ?? products[0];
  const related = products.filter((item) => item.id !== product.id && item.shape === product.shape).slice(0, 2);
  return <><main className="detail-page"><div className="container"><div className="breadcrumbs"><Link href="/collection">Eynəklər</Link><ChevronRight size={12} /><Link href={`/vendor/${product.vendorSlug}`}>{product.vendor}</Link><ChevronRight size={12} /><span>{product.name}</span></div><div className="detail-layout"><div className={`detail-art ${product.tone}`}><img className="detail-photo" src={assetUrl(product.image)} alt={`${product.name} məhsul fotosu`} /><span className="art-label">{product.shape} / {product.material}</span></div><div className="detail-info"><div className="eyebrow">{product.type} · {product.shape}</div><h1>{product.name}</h1><div className="detail-price">{money(product.price)}</div><div className="detail-installment">Qiymət satıcı tərəfindən təqdim olunan nümunə inventarına əsaslanır.</div><p className="detail-copy">{product.description} Məhsulun satıcısı və ölçüləri ilə tanış olduqdan sonra səbətə əlavə edə bilərsən.</p><div className="seller-box"><span><span className="seller-avatar">{vendors.find((vendor) => vendor.slug === product.vendorSlug)?.initials}</span><span><strong>{product.vendor}</strong><small style={{ display: 'block', color: 'var(--muted)', marginTop: 3 }}>Bakı · EYNƏK satıcısı</small></span></span><Link href={`/vendor/${product.vendorSlug}`} data-testid="link-detail-vendor">Vitrinə bax</Link></div><dl className="spec-list"><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Ölçü</dt><dd>{product.size}</dd></div><div><dt>Rəng</dt><dd>{product.color}</dd></div><div><dt>Linza</dt><dd>{product.type === 'Gün eynəyi' ? 'Gün eynəyi linzası' : 'Optikə uyğun demo linza'}</dd></div></dl><div className="detail-actions"><button className="btn btn-blue" onClick={() => onTryOn(product)} data-testid="button-try-on-detail"><ScanFace size={15} /> Üzümdə yoxla</button><button className="btn btn-secondary" onClick={() => onAdd(product)} data-testid="button-add-cart-detail"><ShoppingBag size={15} /> Səbətə əlavə et</button></div><button className={`try-link ${likedIds.has(product.id) ? 'liked' : ''}`} onClick={() => onFavorite(product.id)} data-testid="button-detail-favorite"><Heart size={14} fill={likedIds.has(product.id) ? 'currentColor' : 'none'} /> {likedIds.has(product.id) ? 'Seçilmişlərdədir' : 'Seçilmişlərə əlavə et'}</button></div></div><section className="section" style={{ paddingBottom: 0 }}><div className="section-head"><div><div className="eyebrow">Bənzər forma</div><h2 className="section-title">Buna da bax.</h2></div></div><div className="product-grid">{related.length ? related.map((item) => <ProductCard key={item.id} product={item} liked={likedIds.has(item.id)} onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />) : <p className="section-copy">Bu forma üçün başqa model yoxdur.</p>}</div></section></div></main><Footer /></>;
}

function QuickView({ product, onClose, onAdd, onTryOn }: { product: Product; onClose: () => void; onAdd: (product: Product, message?: string) => void; onTryOn: (product: Product) => void }) {
  return <div className="tryon-backdrop" role="dialog" aria-modal="true" aria-label="Sürətli məhsul baxışı" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="tryon-modal quick-view-modal"><div className="tryon-top" style={{ borderBottom: '1px solid var(--line)', color: 'var(--navy)' }}><div><div className="eyebrow">{product.type}</div><h2>{product.name}</h2><p style={{ color: 'var(--muted)' }}>{product.vendor} · Bakı</p></div><button className="icon-button" onClick={onClose} aria-label="Baxışı bağla" data-testid="button-close-quick-view"><X size={19} /></button></div><div className="quick-view-layout"><div className={`detail-art quick-view-art ${product.tone}`}><img className="detail-photo" src={assetUrl(product.image)} alt={`${product.name} məhsul fotosu`} /></div><div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><div className="detail-price" style={{ marginTop: 0 }}>{money(product.price)}</div><p className="detail-copy">{product.description}</p><div className="spec-list" style={{ margin: '8px 0 17px' }}><div><dt>Forma</dt><dd>{product.shape}</dd></div><div><dt>Ölçü</dt><dd>{product.size}</dd></div></div><button className="btn btn-full" onClick={() => onAdd(product)} data-testid="button-add-cart-quick-view"><ShoppingBag size={14} /> Səbətə əlavə et</button><button className="try-link" onClick={() => onTryOn(product)} data-testid="button-try-on-quick-view"><ScanFace size={14} /> Üzümdə yoxla</button></div></div></div></div>;
}

function VirtualTryOn({ product, onClose, onSelect, onAdd, onSave }: { product: Product; onClose: () => void; onSelect: (product: Product) => void; onAdd: (product: Product, message?: string) => void; onSave: (id: number) => void }) {
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
  return <><main className="seller-page"><div className="container form-shell"><div className="seller-header"><div className="eyebrow">Satıcı onboarding</div><h1>EYNƏK-də sat.</h1><p>Mağazanızı EYNƏK-ə qoşun və məhsullarınızı Azərbaycanda daha çox müştəriyə çatdırın. Müraciət göndərildikdən sonra məlumatlar komanda tərəfindən nəzərdən keçirilir.</p></div>{sent ? <div className="form-success" data-testid="status-seller-application"><strong>Müraciət qəbul edildi.</strong><br />Məlumatlarınız nəzərdən keçirilmək üçün göndərildi. Status: Gözləmədə.</div> : <form className="seller-form" onSubmit={submit} noValidate>{field('storeName', 'Mağaza adı', true)}{field('owner', 'Məsul şəxs', true)}{field('phone', 'Telefon', true, 'tel')}{field('email', 'E-poçt', true, 'email')}<div className="field full"><label htmlFor="seller-business">Biznes haqqında *</label><textarea id="seller-business" value={form.business} onChange={(event) => update('business', event.target.value)} aria-invalid={Boolean(errors.business)} data-testid="input-seller-business" />{errors.business && <span className="field-error">{errors.business}</span>}</div>{field('tax', 'VÖEN (əgər varsa)')}{field('address', 'Mağaza ünvanı', true)}{field('instagram', 'Instagram')}{field('website', 'Veb-sayt')}{field('categories', 'Məhsul kateqoriyaları', true)}<div className="field full"><span className="field-help">Müraciət zamanı mağaza şəkilləri və tələb olunan sənədlər növbəti mərhələdə komanda tərəfindən istənilə bilər.</span></div><div className="form-actions"><button className="btn" type="submit" data-testid="button-submit-seller">Müraciəti göndər <ArrowRight size={14} /></button><span className="field-help">* məcburi sahələr</span></div></form>}</div></main><Footer /></>;
}

function WishlistPage({ likedIds, onFavorite, onQuickView, onTryOn }: CommonProps) {
  const items = products.filter((product) => likedIds.has(product.id));
  return <><main className="collection-page"><div className="container"><div className="collection-intro"><div><div className="eyebrow">Seçilmişlər</div><h1>Saxladığın<br />modellər.</h1></div><p>Qonaq seçilmişləri bu brauzerdə saxlanılır. Modelə bax, VTO önizləməsini aç və ya seçimini sil.</p></div><div className="product-grid wishlist-grid">{items.length ? items.map((product) => <ProductCard key={product.id} product={product} liked onFavorite={onFavorite} onQuickView={onQuickView} onTryOn={onTryOn} />) : <div className="empty-state"><Heart size={22} /><h3>Hələ seçilmiş model yoxdur.</h3><p>Bəyəndiyin çərçivələrdə ürək işarəsinə toxun.</p><Link href="/collection" className="btn btn-secondary" data-testid="link-empty-wishlist">Eynəklərə bax</Link></div>}</div></div></main><Footer /></>;
}

function CartPage({ items, onRemove, onCheckout }: { items: Product[]; onRemove: (id: number) => void; onCheckout: () => void }) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const grouped = vendors.map((vendor) => ({ vendor, items: items.filter((item) => item.vendorSlug === vendor.slug) })).filter((group) => group.items.length);
  return <><main className="cart-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Səbət</div><h1>Sifarişin.</h1></div><p>Marketplace səbətində məhsullar satıcıya görə qruplaşdırılır.</p></div>{items.length ? <div className="cart-panel"><h2>{items.length} məhsul</h2>{grouped.map((group) => <div className="cart-items" key={group.vendor.slug}><div className="eyebrow">{group.vendor.name}</div>{group.items.map((item) => <div className="cart-row" key={`${item.id}-${group.vendor.slug}`}><span><strong>{item.name}</strong><small>{money(item.price)} · {item.size}</small></span><button className="icon-button" onClick={() => onRemove(item.id)} aria-label={`${item.name} sil`} data-testid={`button-remove-cart-${item.id}`}><Trash2 size={15} /></button></div>)}</div>)}<div className="cart-row"><strong>Cəmi</strong><strong>{money(total)}</strong></div><button className="btn" onClick={onCheckout} data-testid="button-checkout">Sifarişə keç <ArrowRight size={14} /></button></div> : <div className="empty-state"><ShoppingBag size={22} /><h3>Səbətin hələ boşdur.</h3><p>Məhsulları bir neçə satıcıdan seçib burada toplaya bilərsən.</p><Link href="/collection" className="btn btn-secondary" data-testid="link-empty-cart">Eynəklərə bax</Link></div>}</div></main><Footer /></>;
}

function AccountPage() {
  return <><main className="account-page"><div className="container"><div className="directory-header"><div><div className="eyebrow">Müştəri hesabı</div><h1>Hesabın.</h1></div><p>Qonaq rejimində seçilmişlər və səbət bu brauzerdə işləyir. Hesab inteqrasiyası növbəti mərhələ üçün hazırlaşdırılır.</p></div><div className="account-panel"><UserRound size={20} /><h2>EYNƏK hesabı</h2><p>Sifarişləri, ünvanları və bildirişləri bir yerdən idarə etmək üçün hesab yaratma axını burada yerləşəcək.</p><Link href="/wishlist" className="btn btn-secondary" data-testid="link-account-wishlist">Seçilmişlərə bax <ArrowRight size={14} /></Link></div></div></main><Footer /></>;
}

function MobileBottomNav({ onTryOn }: { onTryOn: () => void }) {
  const [location] = useLocation();
  return <nav className="mobile-bottom-nav" aria-label="Mobil menyu"><Link href="/" className={location === '/' ? 'active' : ''} data-testid="mobile-nav-home"><Store size={16} />Ana səhifə</Link><Link href="/collection" className={location.startsWith('/collection') ? 'active' : ''} data-testid="mobile-nav-shop"><Search size={16} />Shop</Link><button className="vto-nav" onClick={onTryOn} data-testid="mobile-nav-vto"><ScanFace size={19} />VTO</button><Link href="/wishlist" className={location.startsWith('/wishlist') ? 'active' : ''} data-testid="mobile-nav-wishlist"><Heart size={16} />Seçilmişlər</Link><Link href="/account" className={location.startsWith('/account') ? 'active' : ''} data-testid="mobile-nav-account"><UserRound size={16} />Hesab</Link></nav>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Storefront() {
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const cartCount = cartItems.length;
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2300); };
  const toggleFavorite = (id: number) => { setLikedIds((current) => { const next = new Set(current); if (next.has(id)) { next.delete(id); showToast('Seçilmişlərdən çıxarıldı'); } else { next.add(id); showToast('Seçilmişlərə əlavə edildi'); } return next; }); };
  const addToCart = (product: Product, message = `${product.name} səbətə əlavə edildi`) => { setCartItems((current) => [...current, product]); setQuickProduct(null); setTryOnProduct(null); showToast(message); };
  const removeFromCart = (id: number) => setCartItems((current) => { const index = current.findIndex((item) => item.id === id); return index === -1 ? current : current.filter((_, itemIndex) => itemIndex !== index); });
  const common: CommonProps = { likedIds, onFavorite: toggleFavorite, onQuickView: (product: Product) => setQuickProduct(product), onTryOn: (product: Product) => setTryOnProduct(product) };
  return <div className="app-shell"><Header cartCount={cartCount} onMenu={() => setMobileMenu(!mobileMenu)} />{mobileMenu && <div style={{ position: 'fixed', zIndex: 19, top: 100, left: 0, right: 0, background: 'var(--paper)', borderBottom: '1px solid var(--line)', padding: 18 }}><div className="container" style={{ display: 'grid', gap: 14, fontSize: 13 }}><Link href="/collection" onClick={() => setMobileMenu(false)} data-testid="link-mobile-collection">Eynəklər</Link><Link href="/brands" onClick={() => setMobileMenu(false)} data-testid="link-mobile-brands">Brendlər</Link><Link href="/stores" onClick={() => setMobileMenu(false)} data-testid="link-mobile-stores">Mağazalar</Link><Link href="/seller" onClick={() => setMobileMenu(false)} data-testid="link-mobile-seller">EYNƏK-də sat</Link></div></div>}<Switch><Route path="/collection"><Collection {...common} /></Route><Route path="/stores"><StoresPage /></Route><Route path="/brands"><BrandsPage {...common} /></Route><Route path="/seller"><SellerPage /></Route><Route path="/wishlist"><WishlistPage {...common} /></Route><Route path="/cart"><CartPage items={cartItems} onRemove={removeFromCart} onCheckout={() => showToast('Ödəniş mərhələsi hazırlanır')} /></Route><Route path="/account"><AccountPage /></Route><Route path="/vendor/:slug"><VendorPage {...common} /></Route><Route path="/product/:id"><ProductDetail onAdd={addToCart} onTryOn={setTryOnProduct} onQuickView={setQuickProduct} onFavorite={toggleFavorite} likedIds={likedIds} /></Route><Route path="/"><Home {...common} /></Route><Route component={NotFound} /></Switch><MobileBottomNav onTryOn={() => setTryOnProduct(products[0])} />{quickProduct && <QuickView product={quickProduct} onClose={() => setQuickProduct(null)} onAdd={addToCart} onTryOn={setTryOnProduct} />}{tryOnProduct && <VirtualTryOn product={tryOnProduct} onClose={() => setTryOnProduct(null)} onSelect={setTryOnProduct} onAdd={addToCart} onSave={toggleFavorite} />}{toast && <div className="toast" role="status" data-testid="status-toast"><Check size={16} /><span>{toast}</span></div>}</div>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Storefront /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;