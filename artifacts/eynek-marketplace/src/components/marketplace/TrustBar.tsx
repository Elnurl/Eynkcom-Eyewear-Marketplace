import { ScanFace, Truck, Wallet } from 'lucide-react';
import { az } from '@/i18n/az';

export function TrustBar() {
  return (
    <div className="mp-trust-bar" role="region" aria-label="Xidmət üstünlükləri">
      <div className="container mp-trust-inner">
        <span className="mp-trust-item">
          <ScanFace className="mp-trust-icon" size={14} strokeWidth={1.8} aria-hidden />
          <span className="mp-trust-label">{az.trust.vto}</span>
        </span>
        <span className="mp-trust-item">
          <Wallet className="mp-trust-icon" size={14} strokeWidth={1.8} aria-hidden />
          <span className="mp-trust-label">{az.trust.cod}</span>
        </span>
        <span className="mp-trust-item">
          <Truck className="mp-trust-icon" size={14} strokeWidth={1.8} aria-hidden />
          <span className="mp-trust-label">{az.trust.courier}</span>
        </span>
      </div>
    </div>
  );
}
