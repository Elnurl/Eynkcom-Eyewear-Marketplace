import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { az } from '@/i18n/az';

const shapeLinks = [
  { slug: 'Square', label: 'Square' },
  { slug: 'Round', label: 'Round' },
  { slug: 'Aviator', label: 'Aviator' },
  { slug: 'Cat-Eye', label: 'Cat-eye' },
  { slug: 'Rectangle', label: 'Rectangle' },
  { slug: 'Wayfarer', label: 'Wayfarer' },
];

export function MegaNav() {
  const [location] = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => setOpenKey(null), [location]);
  useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenKey(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openKey]);

  const isActive = (prefix: string) => location.startsWith(prefix);

  return (
    <nav className="mp-mega-nav" aria-label="Əsas menyu" ref={rootRef}>
      <Link href="/collection?type=sunglasses" className={location.includes('type=sunglasses') ? 'active' : ''} data-testid="link-nav-sunglasses">
        {az.nav.sunglasses}
      </Link>
      <Link href="/collection?type=optical" className={location.includes('type=optical') ? 'active' : ''} data-testid="link-nav-optical">
        {az.nav.optical}
      </Link>
      <Link href="/brands" className={isActive('/brands') ? 'active' : ''} data-testid="link-nav-brands">
        {az.nav.brands}
      </Link>
      <Link href="/stores" className={isActive('/stores') || isActive('/vendor') ? 'active' : ''} data-testid="link-nav-stores">
        {az.nav.stores}
      </Link>
      <div
        className="mp-mega-item"
        onMouseEnter={() => setOpenKey('collection')}
        onMouseLeave={() => setOpenKey(null)}
      >
        <Link
          href="/collection"
          className={`mp-mega-trigger${isActive('/collection') ? ' active' : ''}`}
          data-testid="link-nav-collection"
          onFocus={() => setOpenKey('collection')}
        >
          {az.nav.collection} <ChevronDown size={14} strokeWidth={1.8} aria-hidden />
        </Link>
        {openKey === 'collection' && (
          <div className="mp-mega-panel" role="region" aria-label="Kolleksiya alt menyusu">
            <div>
              <p className="mp-mega-label">Kateqoriya</p>
              <Link href="/collection" onClick={() => setOpenKey(null)}>Bütün modellər</Link>
              <Link href="/collection?type=sunglasses" onClick={() => setOpenKey(null)}>Gün eynəkləri</Link>
              <Link href="/collection?type=optical" onClick={() => setOpenKey(null)}>Optik çərçivələr</Link>
            </div>
            <div>
              <p className="mp-mega-label">Forma</p>
              {shapeLinks.map((item) => (
                <Link key={item.slug} href={`/collection?shape=${encodeURIComponent(item.slug)}`} onClick={() => setOpenKey(null)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
