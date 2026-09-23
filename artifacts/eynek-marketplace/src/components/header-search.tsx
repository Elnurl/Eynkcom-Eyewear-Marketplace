import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowRight, Clock3, Search, Store, X } from 'lucide-react';

export type SearchProduct = {
  id: number | string;
  name: string;
  vendor: string;
  type: string;
  shape: string;
  color: string;
  imageUrl: string;
};

type SearchStore = { slug: string; name: string };
type SearchItem = { label: string; description: string; href: string; imageUrl?: string; store?: boolean };
const recentKey = 'eynek-recent-searches';

function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(recentKey) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function HeaderSearch({ products, stores }: { products: SearchProduct[]; stores: SearchStore[] }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [recent, setRecent] = useState<string[]>(readRecent);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
    setTerm('');
  }, [location]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
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

  const remember = (value: string) => {
    const next = [value, ...recent.filter((entry) => entry.toLocaleLowerCase('az') !== value.toLocaleLowerCase('az'))].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(recentKey, JSON.stringify(next));
    } catch {
      // Search remains usable when the browser does not allow local storage.
    }
  };
  const searchHref = (value: string) => `/collection?q=${encodeURIComponent(value)}`;
  const submit = (value: string) => {
    const query = value.trim();
    if (!query) return inputRef.current?.focus();
    remember(query);
    setOpen(false);
    setLocation(searchHref(query));
  };

  const categories: SearchItem[] = [
    { label: 'Optik çərçivələr', description: 'Gündəlik çərçivələr', href: '/collection?type=optical', imageUrl: `${import.meta.env.BASE_URL}product-images/iceriseher-09-cutout.png` },
    { label: 'Gün eynəkləri', description: 'Günəş üçün modellər', href: '/collection?type=sunglasses', imageUrl: `${import.meta.env.BASE_URL}product-images/merdekan-03-cutout.png` },
  ];
  const featured: SearchItem[] = [
    ...categories,
    ...stores.slice(0, 2).map((store) => ({ label: store.name, description: 'Optika mağazası', href: `/vendor/${store.slug}`, store: true })),
  ];
  const normalized = term.trim().toLocaleLowerCase('az');
  const results: SearchItem[] = normalized
    ? [
        ...categories.filter((item) => item.label.toLocaleLowerCase('az').includes(normalized)),
        ...stores.filter((store) => store.name.toLocaleLowerCase('az').includes(normalized)).map((store) => ({ label: store.name, description: 'Optika mağazası', href: `/vendor/${store.slug}`, store: true })),
        ...products.filter((product) => `${product.name} ${product.vendor} ${product.type} ${product.shape} ${product.color}`.toLocaleLowerCase('az').includes(normalized))
          .slice(0, 5).map((product) => ({ label: product.name, description: `${product.type} · ${product.vendor}`, href: `/product/${product.id}`, imageUrl: product.imageUrl })),
      ].slice(0, 6)
    : featured;

  return (
    <div className="nav-search-wrap" ref={rootRef}>
      <button ref={triggerRef} type="button" className="nav-search" aria-label="Eynək və mağaza axtar" aria-expanded={open} aria-controls="header-search-panel" onClick={() => setOpen((current) => !current)} data-testid="link-search">
        <Search size={17} /><span>Eynək və mağaza axtar</span>
      </button>
      {open && <div className="header-search-panel" id="header-search-panel" role="dialog" aria-label="Eynək və mağaza axtarışı" data-testid="header-search-dropdown">
        <form className="header-search-form" role="search" onSubmit={(event) => { event.preventDefault(); submit(term); }}>
          <Search size={20} aria-hidden="true" />
          <input ref={inputRef} type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Nə axtarırsan?" aria-label="Eynək, model və ya mağaza axtar" data-testid="input-header-search" />
          <button type="button" className="header-search-close" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label="Axtarışı bağla"><X size={18} /></button>
        </form>
        <div className="header-search-content">
          {!normalized && <section className="header-search-section">
            <h3>Son axtarışlar</h3>
            {recent.length ? recent.map((value) => <Link key={value} href={searchHref(value)} className="header-search-item" onClick={() => { remember(value); setOpen(false); }}><span className="header-search-item-icon"><Clock3 size={19} /></span><span>{value}</span></Link>) : <p className="header-search-empty-recent">Hələ axtarış edilməyib.</p>}
          </section>}
          <section className="header-search-section">
            <h3>{normalized ? 'Uyğun nəticələr' : 'Kəşf et'}</h3>
            {results.length ? results.map((item) => <Link href={item.href} key={item.href} className="header-search-item" onClick={() => { if (normalized) remember(term.trim()); setOpen(false); }} data-testid={`header-search-result-${item.href.replace(/[^a-z0-9]/gi, '-')}`}>
              <span className="header-search-item-icon">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.store ? <Store size={19} /> : <Search size={19} />}</span>
              <span className="header-search-item-text"><strong>{item.label}</strong><small>{item.description}</small></span>
              <ArrowRight size={15} className="header-search-arrow" />
            </Link>) : <p className="header-search-no-results">Uyğun model və ya mağaza tapılmadı.</p>}
          </section>
          {normalized && <button type="button" className="header-search-all" onClick={() => submit(term)}>Bütün modellərdə “{term.trim()}” axtar <ArrowRight size={15} /></button>}
        </div>
      </div>}
    </div>
  );
}