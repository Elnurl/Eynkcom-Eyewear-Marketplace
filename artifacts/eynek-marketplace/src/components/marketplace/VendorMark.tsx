import { useState } from 'react';
import { uploadedStoreImageUrl } from '@/lib/uploaded-image-url';

type Vendor = {
  initials: string;
  logoPath?: string | null;
  name: string;
};

type VendorMarkProps = {
  vendor: Vendor;
  /** `detail` = product seller row; `vitrine` = storefront hero (larger). */
  variant?: 'card' | 'detail' | 'vitrine';
};

export function VendorMark({ vendor, variant = 'card' }: VendorMarkProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const isVitrine = variant === 'vitrine';
  const isDetail = variant === 'detail' || isVitrine;
  const markClass = isVitrine ? 'seller-avatar seller-avatar--vitrine' : isDetail ? 'seller-avatar' : 'store-mark mp-store-mark';
  const logoClass = isVitrine
    ? 'seller-avatar seller-avatar--logo seller-avatar--vitrine'
    : isDetail
      ? 'seller-avatar seller-avatar--logo'
      : 'store-mark store-mark--logo mp-store-mark';
  const showLogo = Boolean(vendor.logoPath) && !logoFailed;

  if (showLogo && vendor.logoPath) {
    return (
      <span className={logoClass}>
        <img
          src={uploadedStoreImageUrl(vendor.logoPath)}
          alt={`${vendor.name} loqosu`}
          onError={() => setLogoFailed(true)}
        />
      </span>
    );
  }

  return <span className={markClass}>{vendor.initials}</span>;
}
