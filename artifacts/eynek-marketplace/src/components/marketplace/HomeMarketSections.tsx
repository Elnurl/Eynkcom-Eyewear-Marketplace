import { ArrowRight, Store } from 'lucide-react';
import { Link } from 'wouter';
import { SectionLabel } from '@/components/marketplace/SectionLabel';
import { az } from '@/i18n/az';
import type { MarketProduct } from '@/components/marketplace/MarketProductCard';
import { VendorMark } from '@/components/marketplace/VendorMark';

type Vendor = {
  slug: string;
  name: string;
  initials: string;
  logoPath?: string | null;
  description: string;
  location: string;
  count: number;
};

const shapeTiles = [
  { slug: 'Square', label: 'Square' },
  { slug: 'Round', label: 'Round' },
  { slug: 'Aviator', label: 'Aviator' },
  { slug: 'Cat-Eye', label: 'Cat-eye' },
  { slug: 'Rectangle', label: 'Rectangle' },
  { slug: 'Wayfarer', label: 'Wayfarer' },
];

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
  return known[color] ?? '#343840';
}

export function HomeMarketSections({
  products,
  stores,
}: {
  products: MarketProduct[];
  stores: Vendor[];
}) {
  const colors = [...new Set(products.map((p) => p.color.trim()).filter(Boolean))].slice(0, 8);
  const brands = [...new Set(products.map((p) => p.brand.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, 12);

  return (
    <>
      <section className="mp-home-section container">
        <SectionLabel>{az.home.shopByShape}</SectionLabel>
        <h2 className="mp-section-title">Formanı seç.</h2>
        <div className="mp-shape-grid">
          {shapeTiles.map((item) => (
            <Link key={item.slug} href={`/collection?shape=${encodeURIComponent(item.slug)}`} className="mp-shape-tile" data-testid={`link-shape-${item.slug}`}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {colors.length > 0 && (
        <section className="mp-home-section container">
          <SectionLabel>{az.home.shopByColor}</SectionLabel>
          <h2 className="mp-section-title">Rəngə görə.</h2>
          <div className="mp-color-grid">
            {colors.map((color) => (
              <Link key={color} href={`/collection?q=${encodeURIComponent(color)}`} className="mp-color-chip">
                <span className="mp-swatch" style={{ background: frameSwatch(color) }} aria-hidden />
                {color}
              </Link>
            ))}
          </div>
        </section>
      )}

      {brands.length > 0 && (
        <section className="mp-home-section container">
          <SectionLabel>Brendlər</SectionLabel>
          <div className="mp-brand-strip">
            {brands.map((brand) => (
              <Link key={brand} href={`/collection?q=${encodeURIComponent(brand)}`} className="mp-brand-pill">
                {brand}
              </Link>
            ))}
            <Link href="/brands" className="mp-brand-pill mp-brand-pill--more">
              Hamısı <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {stores.length > 0 && (
        <section className="mp-home-section container">
          <SectionLabel>{az.home.storesStrip}</SectionLabel>
          <div className="mp-store-strip">
            {stores.slice(0, 8).map((vendor) => (
              <Link key={vendor.slug} href={`/vendor/${vendor.slug}`} className="mp-store-chip" data-testid={`link-home-store-${vendor.slug}`}>
                <VendorMark vendor={vendor} />
                <span>{vendor.name}</span>
              </Link>
            ))}
            <Link href="/stores" className="mp-store-chip mp-store-chip--all">
              <Store size={18} strokeWidth={1.6} /> Bütün mağazalar
            </Link>
          </div>
        </section>
      )}

      <section className="mp-faq container">
        <SectionLabel>{az.home.faqTitle}</SectionLabel>
        <FaqAccordion />
      </section>
    </>
  );
}

function FaqAccordion() {
  const items = [
    {
      q: 'Virtual sınaq necə işləyir?',
      a: 'Məhsul kartında və ya məhsul səhifəsində «Üzündə yoxla» düyməsinə basın. Kamera icazəsi verildikdən sonra çərçivəni üzünüzdə görə bilərsiniz.',
    },
    {
      q: 'Ödəniş seçimləri hansılardır?',
      a: 'Sifariş zamanı bank kartı ilə ödəniş və ya qapıda nağd ödəniş seçə bilərsiniz.',
    },
    {
      q: 'Çatdırılma necə olur?',
      a: 'Sifarişlər kuryer vasitəsilə çatdırılır. Çatdırılma haqqı sifariş xülasəsində göstərilir.',
    },
    {
      q: 'Məhsullar haradan gəlir?',
      a: 'Hər məhsul təsdiqlənmiş optik mağaza satıcısına aiddir. Kartda satıcı adını görə bilərsiniz.',
    },
  ];
  return (
    <div className="mp-accordion">
      {items.map((item) => (
        <details key={item.q} className="mp-accordion-item">
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
      <Link href="/destek" className="text-link mp-faq-more">
        Dəstək mərkəzi <ArrowRight size={13} />
      </Link>
    </div>
  );
}
