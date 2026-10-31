import { ScanFace, Truck, Wallet } from 'lucide-react';
import { az } from '@/i18n/az';

export function TrustBar() {
  return (
    <div className="mp-trust-bar" role="region" aria-label="Xidmət üstünlükləri">
      <div className="container mp-trust-inner">
        <span><ScanFace size={14} strokeWidth={1.8} aria-hidden /> {az.trust.vto}</span>
        <span><Wallet size={14} strokeWidth={1.8} aria-hidden /> {az.trust.cod}</span>
        <span><Truck size={14} strokeWidth={1.8} aria-hidden /> {az.trust.courier}</span>
      </div>
    </div>
  );
}
