import { ArrowRight, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { az } from '@/i18n/az';

type CatalogProduct = {
  id: number | string;
  type: 'Optik çərçivə' | 'Gün eynəyi';
};

const appealLinks = [
  { label: 'Qadın', href: '/collection?gender=Qadın', image: 'product-images/mimoza-02-worn.png' },
  { label: 'Kişi', href: '/collection?gender=Kişi', image: 'product-images/nisan-07-worn.png' },
  { label: 'Uşaq', href: '/collection?gender=Uniseks', image: 'product-images/luna-24-worn.png' },
  { label: 'Gün eynəyi', href: '/collection?type=sunglasses', image: 'product-images/appeal-sunglasses.png' },
  { label: 'Optik', href: '/collection?type=optical', image: 'product-images/appeal-optical.png' },
] as const;

const PAGE_SIZE = 4;

export function HomeAppealSection() {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="home-appeal haven-shell" aria-labelledby="home-appeal-title">
      <h2 id="home-appeal-title" className="home-appeal-title">
        {az.home.appealTitle}
      </h2>
      <p className="home-appeal-lead">{az.home.appealLead}</p>
      <ul className="home-appeal-circles">
        {appealLinks.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="home-appeal-circle" data-testid={`link-appeal-${item.label}`}>
              <span className="home-appeal-circle-photo">
                <img src={`${base}${item.image}`} alt="" loading="lazy" />
              </span>
              <span className="home-appeal-circle-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeBestSellingSection<T extends CatalogProduct>({
  products,
  renderCard,
}: {
  products: T[];
  renderCard: (product: T) => ReactNode;
}) {
  const [tab, setTab] = useState<'optical' | 'sun'>('optical');
  const [offset, setOffset] = useState(0);

  const pool = useMemo(
    () => products.filter((product) => (tab === 'sun' ? product.type === 'Gün eynəyi' : product.type === 'Optik çərçivə')),
    [products, tab],
  );

  const maxOffset = Math.max(0, pool.length - PAGE_SIZE);
  const safeOffset = Math.min(offset, maxOffset);
  const visible = pool.slice(safeOffset, safeOffset + PAGE_SIZE);
  const progress = pool.length <= PAGE_SIZE ? 100 : ((safeOffset + PAGE_SIZE) / pool.length) * 100;

  const goPrev = () => setOffset((value) => Math.max(0, value - PAGE_SIZE));
  const goNext = () => setOffset((value) => Math.min(maxOffset, value + PAGE_SIZE));

  return (
    <section className="haven-shell home-best" aria-labelledby="home-best-title">
      <div className="home-best-head">
        <h2 id="home-best-title" className="home-best-title">
          {az.home.bestSellingTitle}
        </h2>
        <div className="home-best-tabs" role="tablist" aria-label="Ən çox seçilən">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'optical'}
            className={tab === 'optical' ? 'is-on' : ''}
            onClick={() => { setTab('optical'); setOffset(0); }}
          >
            {az.home.bestSellingOptical}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sun'}
            className={tab === 'sun' ? 'is-on' : ''}
            onClick={() => { setTab('sun'); setOffset(0); }}
          >
            {az.home.bestSellingSun}
          </button>
        </div>
        {pool.length > PAGE_SIZE ? (
          <div className="home-best-arrows" aria-hidden={pool.length <= PAGE_SIZE}>
            <button type="button" className="home-best-arrow" onClick={goPrev} disabled={safeOffset <= 0} aria-label="Əvvəlki modellər">
              <ChevronLeft size={18} strokeWidth={1.8} />
            </button>
            <button type="button" className="home-best-arrow" onClick={goNext} disabled={safeOffset >= maxOffset} aria-label="Növbəti modellər">
              <ChevronRight size={18} strokeWidth={1.8} />
            </button>
          </div>
        ) : null}
      </div>
      {visible.length ? (
        <div className="product-grid haven-grid home-best-grid">{visible.map((product) => renderCard(product))}</div>
      ) : (
        <div className="empty-state home-best-empty">
          <Package size={22} />
          <h3>Kataloq hazırlanır.</h3>
          <p>Satıcılar məhsullarını təsdiqə göndərdikcə modellər burada görünəcək.</p>
          <Link href="/collection" className="haven-btn">
            Kataloqa bax <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <div className="home-best-progress" aria-hidden>
        <i style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}