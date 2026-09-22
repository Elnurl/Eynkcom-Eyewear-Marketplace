import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Truck,
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
  badge?: string;
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
  { id: 1, name: 'Mimoza 02', vendor: 'Optika Nərgiz', vendorSlug: 'optika-nergiz', price: 118, type: 'Optik çərçivə', gender: 'Qadın', shape: 'Cat-Eye', material: 'Asetat', size: 'M (52–18)', color: 'Kərpic / şampan', tone: 'tone-1', frameStyle: 'coral', badge: 'Yeni gələn', description: 'Yumşaq cat-eye xətti və isti kərpic tonu ilə gündəlik görünüşə sakit xarakter verir.' },
  { id: 2, name: 'Sahil 11', vendor: 'Bakı Optik', vendorSlug: 'baki-optik', price: 145, type: 'Gün eynəyi', gender: 'Uniseks', shape: 'Wayfarer', material: 'Asetat', size: 'L (55–19)', color: 'Zeytun', tone: 'tone-2', frameStyle: 'olive', badge: 'Çox seçilən', description: 'Günəşli Bakı günləri üçün dərin zeytun asetat və polarizə linza.' },
  { id: 3, name: 'Nişan 07', vendor: 'Lalə Optik', vendorSlug: 'lale-optik', price: 92, type: 'Optik çərçivə', gender: 'Uniseks', shape: 'Rectangle', material: 'Metal', size: 'M (51–19)', color: 'Qrafit', tone: 'tone-3', frameStyle: 'clear', description: 'İncə metal konstruksiya, yüngül burun körpüsü və təmiz düzbucaqlı forma.' },
  { id: 4, name: 'Xəzər Air', vendor: 'Dəniz Optika', vendorSlug: 'deniz-optika', price: 164, type: 'Gün eynəyi', gender: 'Kişi', shape: 'Aviator', material: 'Titanium', size: 'L (58–16)', color: 'Qızılı / yaşıl', tone: 'tone-4', frameStyle: 'gold', badge: 'Polarizə', description: 'Titanium aviator quruluşu ilə yüngül, davamlı və parlaq sahil işığına hazır.' },
  { id: 5, name: 'Luna 24', vendor: 'Optika Nərgiz', vendorSlug: 'optika-nergiz', price: 127, type: 'Optik çərçivə', gender: 'Qadın', shape: 'Round', material: 'Asetat', size: 'S (49–20)', color: 'Tünd tısbağa', tone: 'tone-5', frameStyle: 'olive', description: 'Dairəvi siluet və tünd tısbağa naxışı ilə retro, amma bu günə aid.' },
  { id: 6, name: 'Mərdəkan 03', vendor: 'Bakı Optik', vendorSlug: 'baki-optik', price: 139, type: 'Gün eynəyi', gender: 'Uniseks', shape: 'Square', material: 'Asetat', size: 'M (53–18)', color: 'Qara / çay', tone: 'tone-1', frameStyle: 'sunglass', description: 'Kvadrat ön hissə və çay rəngli linza ilə şəhər ritminə uyğun gün eynəyi.' },
  { id: 7, name: 'İçərişəhər 09', vendor: 'Lalə Optik', vendorSlug: 'lale-optik', price: 109, type: 'Optik çərçivə', gender: 'Kişi', shape: 'Rectangle', material: 'Metal', size: 'L (55–18)', color: 'Fırçalanmış gümüş', tone: 'tone-2', frameStyle: 'clear', description: 'Klassik düzbucaqlı xətt, metalik sakitlik və ofisdən axşama rahat keçid.' },
  { id: 8, name: 'Caspian Sun', vendor: 'Dəniz Optika', vendorSlug: 'deniz-optika', price: 151, type: 'Gün eynəyi', gender: 'Qadın', shape: 'Cat-Eye', material: 'Bio-nylon', size: 'M (53–17)', color: 'Şəffaf bal', tone: 'tone-4', frameStyle: 'coral', badge: 'Eksklüziv', description: 'Bal rəngli şəffaf bio-nylon, qaldırılmış künclər və yumşaq gradient linza.' },
];

const vendors: Vendor[] = [
  { slug: 'optika-nergiz', name: 'Optika Nərgiz', initials: 'ON', location: '28 May, Bakı', since: '2008-dən', count: 2, description: 'Qadın və uniseks çərçivələrdə seçilmiş rənglər, dürüst məsləhət və şəhər üslubu.' },
  { slug: 'baki-optik', name: 'Bakı Optik', initials: 'BO', location: 'Nizami küçəsi, Bakı', since: '2014-dən', count: 2, description: 'Klassik formaları müasir materiallarla birləşdirən ailə optikası.' },
  { slug: 'lale-optik', name: 'Lalə Optik', initials: 'LO', location: 'Elmlər Akademiyası, Bakı', since: '2011-dən', count: 2, description: 'Yüngül metal çərçivələr və ölçü üzrə dəqiq uyğunlaşdırma ilə tanınır.' },
  { slug: 'deniz-optika', name: 'Dəniz Optika', initials: 'DO', location: 'Sahil, Bakı', since: '2018-dən', count: 2, description: 'Gün eynəkləri, polarizə linzalar və Xəzər işığına uyğun rənglər.' },
];

const shapes: Product['shape'][] = ['Aviator', 'Cat-Eye', 'Rectangle', 'Round', 'Square', 'Wayfarer'];
const genders = ['Qadın', 'Kişi', 'Uniseks'];
const materials = ['Asetat', 'Metal', 'Titanium', 'Bio-nylon'];

function money(value: number) {
  return `${value.toFixed(0)} ₼`;
}

function FrameVisual({ shape, frameStyle = 'clear', sunglasses = false }: { shape: Product['shape']; frameStyle?: string; sunglasses?: boolean }) {
  return (
    <div className={`frame-visual ${shape.toLowerCase().replace('-', '-')} ${frameStyle} ${sunglasses ? 'sunglass' : ''}`} aria-label={`${shape} çərçivə təsviri`}>
      <span />
      <span />
    </div>
  );
}

function Header({ cartCount, onMenu, onFavorites }: { cartCount: number; onMenu: () => void; onFavorites: () => void }) {
  const [location] = useLocation();
  return (
    <>
      <div className="announcement"><strong>Yeni:</strong>&nbsp; Bakı mağazalarından seçilmiş çərçivələr — çatdırılma 24 saatdan</div>
      <header className="topbar">
        <div className="container nav">
          <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Menyunu aç" data-testid="button-menu">
            <Menu size={20} />
          </button>
          <Link href="/" className="brand" data-testid="link-brand">
            <span className="brand-word">eynək<span className="brand-dot">.</span>com</span>
            <span className="brand-note">Bakı üçün optika</span>
          </Link>
          <nav className="nav-links" aria-label="Əsas menyu">
            <Link href="/collection" className={location.startsWith('/collection') ? 'active' : ''} data-testid="link-collection">Çərçivələr</Link>
            <Link href="/collection?type=sunglasses" className="nav-sunglasses" data-testid="link-sunglasses">Gün eynəkləri</Link>
            <Link href="/collection?type=optical" data-testid="link-optical">Optik</Link>
            <Link href="/#stores" data-testid="link-stores">Mağazalar</Link>
          </nav>
          <div className="nav-actions">
            <Link href="/collection" className="icon-button" aria-label="Axtarış" data-testid="link-search"><Search size={18} /></Link>
            <button className="icon-button" onClick={onFavorites} aria-label="Seçilmişlər" data-testid="button-favorites"><Heart size={18} /></button>
            <Link href="/collection" className="icon-button cart-button" aria-label="Səbət" data-testid="link-cart"><ShoppingBag size={18} /><span className="cart-count">{cartCount}</span></Link>
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
        <div>
          <div className="brand"><span className="brand-word">eynək<span className="brand-dot">.</span>com</span><span className="brand-note">Bakı üçün optika</span></div>
          <p>Şəxsi üslubunuzu Bakının müstəqil optik mağazaları ilə bir yerdə kəşf edin.</p>
        </div>
        <div><h3>Kəşf et</h3><Link href="/collection">Bütün çərçivələr</Link><Link href="/collection?shape=Cat-Eye">Cat-Eye</Link><Link href="/collection?type=sunglasses">Gün eynəkləri</Link></div>
        <div><h3>Yardım</h3><a href="#size">Ölçünü necə tapım?</a><a href="#delivery">Çatdırılma</a><a href="#returns">Qaytarılma</a></div>
        <div><h3>Mağaza ol</h3><a href="#partner">Eynək.com-a qoşul</a><a href="#contact">Bizimlə əlaqə</a><a href="#instagram">Instagram</a></div>
      </div>
      <div className="container footer-bottom"><span>© 2024 Eynək.com</span><span>Bakı • Azərbaycan</span></div>
    </footer>
  );
}

function ProductCard({ product, liked, onFavorite, onQuickView }: { product: Product; liked: boolean; onFavorite: (id: number) => void; onQuickView: (product: Product) => void }) {
  return (
    <article className="product-card" data-testid={`card-product-${product.id}`}>
      <div className={`product-image ${product.tone}`}>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button className={`heart-button ${liked ? 'liked' : ''}`} onClick={() => onFavorite(product.id)} aria-label={`${product.name} seçilmişlərə əlavə et`} data-testid={`button-favorite-${product.id}`}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
        </button>
        <FrameVisual shape={product.shape} frameStyle={product.frameStyle} sunglasses={product.type === 'Gün eynəyi'} />
        <button className="btn btn-secondary quick-view" onClick={() => onQuickView(product)} data-testid={`button-quick-view-${product.id}`}>Sürətli baxış <ArrowRight size={14} /></button>
      </div>
      <div className="product-info">
        <Link href={`/vendor/${product.vendorSlug}`} className="product-vendor" data-testid={`link-vendor-${product.id}`}>{product.vendor} • Bakı</Link>
        <Link href={`/product/${product.id}`} data-testid={`link-product-${product.id}`}><h3 className="product-name">{product.name}</h3></Link>
        <div className="product-meta"><span className="product-price">{money(product.price)}</span><span className="product-type">{product.type}</span></div>
      </div>
    </article>
  );
}

function Home({ onQuickView, likedIds, onFavorite, setTryOn }: { onQuickView: (product: Product) => void; likedIds: Set<number>; onFavorite: (id: number) => void; setTryOn: (product: Product) => void }) {
  return (
    <>
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="hero-kicker eyebrow"><span /> Bakıdan seçildi</div>
              <h1>Üzünüzə<br /><em>yaraşan</em> hekayə.</h1>
              <p className="hero-sub">Müstəqil optikalardan seçilmiş çərçivələr. Formanı tapın, ölçünü müqayisə edin, özünüz kimi görünən eynəyi seçin.</p>
              <div className="hero-actions"><Link href="/collection" className="btn" data-testid="link-hero-collection">Çərçivələri kəşf et <ArrowRight size={16} /></Link><Link href="/#stores" className="btn btn-secondary" data-testid="link-hero-stores">Mağazalara bax</Link></div>
              <div className="hero-note"><BadgeCheck size={16} /> Hər satıcı yerli optika tərəfindən təsdiqlənir</div>
            </div>
            <div className="hero-art" aria-label="Eynək taxan portret illüstrasiyası">
              <div className="hero-art-back" /><div className="hero-art-photo" /><div className="hero-glasses"><span className="hero-lens" /><span className="hero-bridge" /><span className="hero-lens" /></div><div className="art-sticker">sənin<br />forman,<br />sənin qaydan</div><div className="hero-caption mono">01 / yeni kolleksiya — 2024</div>
            </div>
          </div>
        </section>
        <div className="strip"><div className="container strip-inner"><div className="strip-item"><Store size={16} /> 12 yerli optika</div><div className="strip-item"><Truck size={16} /> Bakı daxilində sürətli çatdırılma</div><div className="strip-item"><ShieldCheck size={16} /> 7 gün rahat qaytarılma</div></div></div>
        <section className="section"><div className="container"><div className="section-head"><div><div className="eyebrow">Üz formasına görə</div><h2 className="section-title">Siluetinizi seçin</h2></div><p className="section-copy">Axtarışa forma ilə başlayın. Sonra ölçü, material və qiymət aralığı ilə seçiminizi dəqiqləşdirin.</p></div>
          <div className="shape-row">{shapes.map((shape) => <Link href={`/collection?shape=${shape}`} key={shape} className="shape-card" data-shape={shape.toLowerCase()} data-testid={`link-shape-${shape}`}><div className="shape-icon"><div className="shape-glasses"><i /><i /></div></div><p>{shape}</p></Link>)}</div>
        </div></section>
        <section className="section" style={{ paddingTop: 0 }}><div className="container"><div className="section-head"><div><div className="eyebrow">Bu həftə</div><h2 className="section-title">Sakit görünür,<br />çox şey deyir.</h2></div><Link href="/collection" className="text-link" data-testid="link-view-all">Hamısını gör <ArrowRight size={15} /></Link></div><div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} />)}</div></div></section>
        <section className="section" id="stores"><div className="container"><div className="feature-layout"><div className="feature-card"><div className="eyebrow" style={{ color: 'var(--ink)' }}>Baxışınızı dəyişin</div><h3>Üzünüzün ən yaxşı tərəfi.</h3><p>Özünüzü kamerada görmək üçün virtual sınağı açın.</p><button className="btn btn-secondary" onClick={() => setTryOn(products[0])} data-testid="button-home-tryon">Virtual sınağı aç <Video size={15} /></button><div className="mini-frame"><div className="shape-glasses"><i /><i /></div></div></div><div className="feature-card"><div className="eyebrow" style={{ color: 'var(--sun)' }}>Yerli seçim</div><h3>Mağaza-mağaza gəzmədən, Bakı-Bakı kəşf edin.</h3><p>Eyni modelin fərqli satıcılardakı qiymətini və ölçüsünü bir baxışda müqayisə edin.</p><Link className="btn" href="/collection" data-testid="link-feature-browse">Seçimə bax <ArrowRight size={15} /></Link><div className="mini-frame"><div className="shape-glasses"><i /><i /></div></div></div></div></div></section>
      </main>
      <Footer />
    </>
  );
}

function Filters({ filters, setFilters, open }: { filters: { gender: string; material: string; type: string; maxPrice: number; size: string }; setFilters: (filters: { gender: string; material: string; type: string; maxPrice: number; size: string }) => void; open: boolean }) {
  const update = (key: keyof typeof filters, value: string | number) => setFilters({ ...filters, [key]: value });
  return (
    <aside className={`filter-panel ${open ? 'open' : ''}`}>
      <div className="filter-group"><div className="filter-title">Cins <ChevronDown size={15} /></div>{genders.map((item) => <label className="check-row" key={item}><input type="radio" name="gender" checked={filters.gender === item} onChange={() => update('gender', filters.gender === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Növ <ChevronDown size={15} /></div>{['Optik çərçivə', 'Gün eynəyi'].map((item) => <label className="check-row" key={item}><input type="radio" name="type" checked={filters.type === item} onChange={() => update('type', filters.type === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Material <ChevronDown size={15} /></div>{materials.map((item) => <label className="check-row" key={item}><input type="radio" name="material" checked={filters.material === item} onChange={() => update('material', filters.material === item ? '' : item)} />{item}</label>)}</div>
      <div className="filter-group"><div className="filter-title">Maksimum qiymət</div><input type="range" min="60" max="180" step="1" value={filters.maxPrice} onChange={(event) => update('maxPrice', Number(event.target.value))} /><div className="range-labels"><span>60 ₼</span><span>{filters.maxPrice} ₼</span></div></div>
      <div className="filter-group"><div className="filter-title">Ölçü <ChevronDown size={15} /></div>{['S', 'M', 'L'].map((item) => <label className="check-row" key={item}><input type="radio" name="size" checked={filters.size === item} onChange={() => update('size', filters.size === item ? '' : item)} />{item} çərçivə</label>)}</div>
    </aside>
  );
}

function Collection({ likedIds, onFavorite, onQuickView }: { likedIds: Set<number>; onFavorite: (id: number) => void; onQuickView: (product: Product) => void }) {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Seçilənlər');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ gender: '', material: '', type: '', maxPrice: 180, size: '' });
  const shape = params.get('shape') ?? '';
  const queryType = params.get('type');
  const filtered = useMemo(() => {
    const list = products.filter((product) => {
      const haystack = `${product.name} ${product.vendor} ${product.shape} ${product.color}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesShape = !shape || product.shape.toLowerCase() === shape.toLowerCase();
      const matchesType = filters.type ? product.type === filters.type : queryType === 'sunglasses' ? product.type === 'Gün eynəyi' : queryType === 'optical' ? product.type === 'Optik çərçivə' : true;
      const matchesSize = !filters.size || product.size.startsWith(filters.size);
      return matchesQuery && matchesShape && matchesType && matchesSize && (!filters.gender || product.gender === filters.gender) && (!filters.material || product.material === filters.material) && product.price <= filters.maxPrice;
    });
    if (sort === 'Qiymət: aşağıdan yuxarı') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Qiymət: yuxarıdan aşağı') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [filters, query, queryType, shape, sort]);
  const clearFilters = () => { setFilters({ gender: '', material: '', type: '', maxPrice: 180, size: '' }); setLocation('/collection'); };
  return (
    <>
      <main className="collection-page"><div className="container">
        <div className="collection-intro"><div><div className="eyebrow">Kolleksiya / 2024</div><h1>Görünüşünüz<br />burada başlayır.</h1></div><p>{shape ? `${shape} forması üçün seçilmiş çərçivələr.` : 'Müstəqil Bakı optikalarından seçilmiş, müqayisəyə hazır çərçivələr.'}</p></div>
        <div className="collection-tools"><div className="search-box"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Model, mağaza və ya forma axtar..." data-testid="input-search-products" /></div><button className="btn btn-secondary filter-toggle" onClick={() => setFilterOpen(!filterOpen)} data-testid="button-toggle-filters"><SlidersHorizontal size={15} /> Filtrlər</button><select className="select-control" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sıralama" data-testid="select-sort"><option>Seçilənlər</option><option>Qiymət: aşağıdan yuxarı</option><option>Qiymət: yuxarıdan aşağı</option></select></div>
        <div className="catalog-layout"><Filters filters={filters} setFilters={setFilters} open={filterOpen} /><section><div className="catalog-head"><span><strong>{filtered.length}</strong> çərçivə</span><button className="text-link" onClick={clearFilters} data-testid="button-clear-filters">Təmizlə <X size={13} /></button></div><div className="product-grid">{filtered.length ? filtered.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} />) : <div className="empty-state"><Search size={23} /><h3>Bu seçimə uyğun çərçivə yoxdur</h3><p>Axtarışı və ya filtrləri bir az yumşaldın.</p><button className="btn btn-secondary" onClick={clearFilters} data-testid="button-empty-reset">Filtrləri sıfırla</button></div>}</div></section></div>
      </div></main><Footer />
    </>
  );
}

function VendorPage({ likedIds, onFavorite, onQuickView }: { likedIds: Set<number>; onFavorite: (id: number) => void; onQuickView: (product: Product) => void }) {
  const { slug = '' } = useParams<{ slug: string }>();
  const vendor = vendors.find((item) => item.slug === slug) ?? vendors[0];
  const items = products.filter((product) => product.vendorSlug === vendor.slug);
  return (
    <>
      <main className="vendor-page"><div className="container"><div className="vendor-hero"><div><div className="eyebrow" style={{ color: 'var(--sun)' }}>Təsdiqlənmiş satıcı</div><h1>{vendor.name}</h1><p>{vendor.description}</p></div><div className="vendor-actions"><Link href="/collection" className="btn btn-secondary" data-testid="link-vendor-back">Kolleksiyaya qayıt</Link></div></div><div className="vendor-details"><span><MapPin size={14} /> {vendor.location}</span><span><BadgeCheck size={14} /> {vendor.since}</span><span><ShoppingBag size={14} /> {vendor.count} seçilmiş model</span></div><section className="section" style={{ padding: '45px 0 0' }}><div className="section-head"><div><div className="eyebrow">Mağaza seçimi</div><h2 className="section-title">Bu vitrində</h2></div><span className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>01—{String(items.length).padStart(2, '0')}</span></div><div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.has(product.id)} onFavorite={onFavorite} onQuickView={onQuickView} />)}</div></section></div></main><Footer />
    </>
  );
}

function ProductDetail({ onAdd, onTryOn, onQuickView, onFavorite, likedIds }: { onAdd: (product: Product, message?: string) => void; onTryOn: (product: Product) => void; onQuickView: (product: Product) => void; onFavorite: (id: number) => void; likedIds: Set<number> }) {
  const { id = '1' } = useParams<{ id: string }>();
  const product = products.find((item) => item.id === Number(id)) ?? products[0];
  const related = products.filter((item) => item.id !== product.id && item.shape === product.shape).slice(0, 2);
  return (
    <>
      <main className="detail-page"><div className="container"><div className="breadcrumbs"><Link href="/collection">Kolleksiya</Link><ChevronRight size={13} /><Link href={`/vendor/${product.vendorSlug}`}>{product.vendor}</Link><ChevronRight size={13} /><span>{product.name}</span></div><div className="detail-layout"><div className={`detail-art ${product.tone}`}><FrameVisual shape={product.shape} frameStyle={product.frameStyle} sunglasses={product.type === 'Gün eynəyi'} /><span className="art-label">{product.shape} / {product.material}</span></div><div className="detail-info"><div className="eyebrow">{product.type} · {product.shape}</div><h1>{product.name}</h1><div className="detail-price">{money(product.price)}</div><div className="detail-installment">3 aya qədər faizsiz bölmək mümkündür</div><p className="detail-copy">{product.description} Eynək.com-da bu modeli Bakı daxilindəki müstəqil satıcılardan müqayisə edə, mağazaya getməzdən əvvəl ölçüləri yoxlaya bilərsiniz.</p><div className="seller-box"><span><span className="seller-avatar">{vendors.find((vendor) => vendor.slug === product.vendorSlug)?.initials}</span><span><strong>{product.vendor}</strong><small style={{ display: 'block', color: 'var(--ink-soft)', marginTop: 3 }}>Bakı · təsdiqlənmiş</small></span></span><Link href={`/vendor/${product.vendorSlug}`} data-testid="link-detail-vendor">Vitrinə bax</Link></div><dl className="spec-list"><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Ölçü</dt><dd>{product.size}</dd></div><div><dt>Rəng</dt><dd>{product.color}</dd></div><div><dt>Linza</dt><dd>{product.type === 'Gün eynəyi' ? 'UV400 · polarizə' : 'Demo · optikə uyğun'}</dd></div></dl><div className="detail-actions"><button className="btn" onClick={() => onAdd(product)} data-testid="button-add-cart-detail"><ShoppingBag size={16} /> Səbətə əlavə et</button><button className="btn btn-coral" onClick={() => onAdd(product, 'Sifariş üçün səbət hazırdır')} data-testid="button-buy-now-detail">İndi al <ArrowRight size={16} /></button></div><button className="try-link" onClick={() => onTryOn(product)} data-testid="button-try-on-detail"><Video size={15} /> 3D virtual sınağı aç</button></div></div><section className="section" style={{ paddingBottom: 0 }}><div className="section-head"><div><div className="eyebrow">Bənzər forma</div><h2 className="section-title">Buna da baxın</h2></div></div><div className="product-grid">{related.length ? related.map((item) => <ProductCard key={item.id} product={item} liked={likedIds.has(item.id)} onFavorite={onFavorite} onQuickView={onQuickView} />) : <p className="section-copy">Bu forma üçün başqa model tezliklə əlavə olunacaq.</p>}</div></section></div></main><Footer />
    </>
  );
}

function QuickView({ product, onClose, onAdd, onTryOn }: { product: Product; onClose: () => void; onAdd: (product: Product, message?: string) => void; onTryOn: (product: Product) => void }) {
  return (
    <div className="tryon-backdrop" role="dialog" aria-modal="true" aria-label="Sürətli məhsul baxışı" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="tryon-modal" style={{ height: 'auto', maxWidth: 620, background: 'var(--paper)', color: 'var(--ink)' }}><div className="tryon-top" style={{ borderBottom: '1px solid var(--line)' }}><div><div className="eyebrow">{product.type}</div><h2>{product.name}</h2><p style={{ color: 'var(--ink-soft)' }}>{product.vendor} · Bakı</p></div><button className="icon-button" onClick={onClose} aria-label="Baxışı bağla" data-testid="button-close-quick-view"><X size={20} /></button></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, padding: 22 }}><div className={`detail-art ${product.tone}`} style={{ height: 260 }}><FrameVisual shape={product.shape} frameStyle={product.frameStyle} sunglasses={product.type === 'Gün eynəyi'} /></div><div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><div className="detail-price" style={{ marginTop: 0 }}>{money(product.price)}</div><p className="detail-copy" style={{ margin: '14px 0' }}>{product.description}</p><div className="spec-list" style={{ margin: '8px 0 18px' }}><div><dt>Forma</dt><dd>{product.shape}</dd></div><div><dt>Ölçü</dt><dd>{product.size}</dd></div></div><button className="btn btn-full" onClick={() => onAdd(product)} data-testid="button-add-cart-quick-view"><ShoppingBag size={15} /> Səbətə əlavə et</button><button className="try-link" onClick={() => onTryOn(product)} data-testid="button-try-on-quick-view"><Video size={15} /> Virtual sınaq</button></div></div></div>
    </div>
  );
}

function VirtualTryOn({ product, onClose, onSelect }: { product: Product; onClose: () => void; onSelect: (product: Product) => void }) {
  const options = products.slice(0, 6);
  return (
    <div className="tryon-backdrop" role="dialog" aria-modal="true" aria-label="Virtual sınaq"><div className="tryon-modal"><div className="tryon-top"><div><h2>Virtual sınaq</h2><p>Üzünüzdə necə göründüyünü təxmin edin</p></div><button className="icon-button close-light" onClick={onClose} aria-label="Virtual sınağı bağla" data-testid="button-close-tryon"><X size={20} /></button></div><div className="camera-stage"><div className="person-silhouette"><div className="person-head" /></div><div className="tryon-frame"><FrameVisual shape={product.shape} frameStyle={product.frameStyle} sunglasses={product.type === 'Gün eynəyi'} /></div><div className="scan-label">ÜZ AŞKARLANDI · LIVE</div></div><div className="tryon-bottom"><p>Modeli dəyiş</p><div className="frame-switcher">{options.map((option) => <button key={option.id} className={`frame-choice ${option.id === product.id ? 'active' : ''}`} onClick={() => onSelect(option)} aria-label={`${option.name} modelini sına`} data-testid={`button-tryon-frame-${option.id}`}><FrameVisual shape={option.shape} frameStyle={option.frameStyle} /><small>{option.name}</small></button>)}</div></div></div></div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Storefront() {
  const [cartCount, setCartCount] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2300); };
  const toggleFavorite = (id: number) => { setLikedIds((current) => { const next = new Set(current); if (next.has(id)) { next.delete(id); showToast('Seçilmişlərdən çıxarıldı'); } else { next.add(id); showToast('Seçilmişlərə əlavə edildi'); } return next; }); };
  const addToCart = (product: Product, message = `${product.name} səbətə əlavə edildi`) => { setCartCount((count) => count + 1); setQuickProduct(null); showToast(message); };
  const common = { likedIds, onFavorite: toggleFavorite, onQuickView: (product: Product) => setQuickProduct(product) };
  return (
    <div className="app-shell">
      <Header cartCount={cartCount} onMenu={() => setMobileMenu(!mobileMenu)} onFavorites={() => showToast(likedIds.size ? `${likedIds.size} model seçilib` : 'Hələ model seçməmisiniz')} />
      {mobileMenu && <div style={{ position: 'fixed', zIndex: 19, top: 101, left: 0, right: 0, background: 'var(--white)', borderBottom: '1px solid var(--line)', padding: 18 }}><div className="container" style={{ display: 'grid', gap: 14, fontSize: 14 }}><Link href="/collection" onClick={() => setMobileMenu(false)} data-testid="link-mobile-collection">Çərçivələr</Link><Link href="/collection?type=sunglasses" onClick={() => setMobileMenu(false)} data-testid="link-mobile-sunglasses">Gün eynəkləri</Link><Link href="/#stores" onClick={() => setMobileMenu(false)} data-testid="link-mobile-stores">Mağazalar</Link></div></div>}
      <Switch>
        <Route path="/collection"><Collection {...common} /></Route>
        <Route path="/vendor/:slug"><VendorPage {...common} /></Route>
        <Route path="/product/:id"><ProductDetail onAdd={addToCart} onTryOn={setTryOnProduct} onQuickView={setQuickProduct} onFavorite={toggleFavorite} likedIds={likedIds} /></Route>
        <Route path="/"><Home {...common} setTryOn={setTryOnProduct} /></Route>
        <Route component={NotFound} />
      </Switch>
      {quickProduct && <QuickView product={quickProduct} onClose={() => setQuickProduct(null)} onAdd={addToCart} onTryOn={setTryOnProduct} />}
      {tryOnProduct && <VirtualTryOn product={tryOnProduct} onClose={() => setTryOnProduct(null)} onSelect={setTryOnProduct} />}
      {toast && <div className="toast" role="status" data-testid="status-toast"><Check size={17} /><span>{toast}</span></div>}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary><Storefront /></RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;