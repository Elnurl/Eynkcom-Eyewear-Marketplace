import { useState } from 'react';
import { uploadedStoreImageUrl } from '@/lib/uploaded-image-url';

type Vendor = {
  initials: string;
  logoPath?: string | null;
  name: string;
};

type VendorMarkProps = {
  vendor: Vendor;
  /** `detail` matches product page seller row (38px). */
  variant?: 'card' | 'detail';
};

export function VendorMark({ vendor, variant = 'card' }: VendorMarkProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const isDetail = variant === 'detail';
  const markClass = isDetail ? 'seller-avatar' : 'store-mark mp-store-mark';
  const logoClass = isDetail ? 'seller-avatar seller-avatar--logo' : 'store-mark store-mark--logo mp-store-mark';
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
