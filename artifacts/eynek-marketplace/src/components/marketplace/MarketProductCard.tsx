import { Heart, ScanFace } from 'lucide-react';
import { Link } from 'wouter';
import { az } from '@/i18n/az';

export type MarketProduct = {
  id: number | string;
  name: string;
  image: string;
  sideImage?: string;
  wornImage?: string;
  vendor: string;
  vendorSlug: string;
  price: number;
  type: string;
  color: string;
  brand: string;
  tone: string;
  previewOnly?: boolean;
  isAvailable: boolean;
};

export function productSupportsVto(product: Pick<MarketProduct, 'previewOnly' | 'isAvailable'>) {
  return !product.previewOnly && product.isAvailable;
}

type HoverImage = { src: string; kind: 'worn' | 'side' } | null;

export function MarketProductCard({
  product,
  liked,
  onFavorite,
  onTryOn,
  photoSrc,
  hover,
  swatchColor,
  formatPrice,
}: {
  product: MarketProduct;
  liked: boolean;
  onFavorite: (id: number | string) => void;
  onTryOn: (product: MarketProduct) => void;
  photoSrc: (path: string) => string;
  hover: HoverImage;
  swatchColor: string;
  formatPrice: (value: number) => string;
}) {
  const vto = productSupportsVto(product);
  const sellerHref = product.vendorSlug ? `/vendor/${product.vendorSlug}` : null;

  return (
    <article className="product-card mp-product-card" data-testid={`card-product-${product.id}`}>
      <div className={`product-image mp-product-tile ${product.tone}`}>
        <Link href={`/product/${product.id}`} className="product-image-link" aria-label={`${product.name} məhsul səhifəsini aç`} data-testid={`link-product-image-${product.id}`}>
          <img className="product-photo" src={photoSrc(product.image)} alt={`${product.name} — ${product.color} eynək modeli, ön görünüş`} loading="lazy" />
          {hover?.kind === 'worn' && <img className="product-photo on-model" src={photoSrc(hover.src)} alt={`${product.name} modelin üzündə`} loading="lazy" />}
          {hover?.kind === 'side' && <img className="product-photo side-view" src={photoSrc(hover.src)} alt={`${product.name} — ${product.color} eynək modeli, yan görünüş`} loading="lazy" />}
        </Link>
        <button type="button" className={`heart-button mp-heart ${liked ? 'liked' : ''}`} onClick={() => onFavorite(product.id)} aria-label={`${product.name} seçilmişlərə əlavə et`} data-testid={`button-favorite-${product.id}`}>
          <Heart size={18} strokeWidth={1.8} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-info mp-product-info">
        {product.brand ? <span className="product-label mp-brand">{product.brand}</span> : null}
        <Link href={`/product/${product.id}`} data-testid={`link-product-${product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <p className="mp-color-row">
          <i className="mp-swatch" style={{ background: swatchColor }} aria-hidden />
          {product.color}
        </p>
        {!product.previewOnly && product.price > 0 ? (
          <span className="product-price mp-price">{formatPrice(product.price)}</span>
        ) : product.previewOnly ? (
          <span className="mp-sample-tag">{az.product.sampleLabel}</span>
        ) : null}
        <p className="mp-seller-line">
          {az.product.seller}:{' '}
          {sellerHref ? (
            <Link href={sellerHref} className="mp-seller-link" data-testid={`link-seller-${product.id}`}>
              {product.vendor}
            </Link>
          ) : (
            <span>{product.vendor}</span>
          )}
        </p>
        {vto ? (
          <button type="button" className="btn btn-primary mp-vto-btn" onClick={() => onTryOn(product)} data-testid={`button-try-on-${product.id}`}>
            <ScanFace size={16} strokeWidth={1.8} aria-hidden /> {az.product.tryOn}
          </button>
        ) : null}
      </div>
    </article>
  );
}
