import type { ReactNode } from 'react';
import { ArrowLeft, Eye, Glasses, LayoutDashboard, LayoutGrid, LogOut, Package, Settings, ShoppingBag, Store, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { BrandLogo, BrandWord } from '@/components/brand-logo';
import { sellerImageUrl } from '@/lib/seller-images';
import { vitrinePublicPath } from '@/pages/vitrine';

export type SellerPanelTab = 'overview' | 'products' | 'store' | 'orders';

type Props = {
  storeName: string;
  storeSlug?: string;
  logoPath?: string | null;
  productCount?: number;
  active: SellerPanelTab;
  onTab?: (tab: Exclude<SellerPanelTab, 'orders'>) => void;
  onLogout: () => void;
  children: ReactNode;
};

function TabItem({
  active,
  onClick,
  href,
  icon,
  label,
  testId,
}: {
  active: boolean;
  onClick?: () => void;
  href?: string;
  icon: ReactNode;
  label: string;
  testId: string;
}) {
  const className = `seller-top-nav-item${active ? ' active' : ''}`;
  if (href) {
    return (
      <Link href={href} className={className} data-testid={testId}>
        {icon}
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} data-testid={testId}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function SellerPanelShell({ storeName, storeSlug, logoPath, productCount = 0, active, onTab, onLogout, children }: Props) {
  const pickTab = (tab: Exclude<SellerPanelTab, 'orders'>) => {
    if (onTab) onTab(tab);
  };
  const vitrineHref = storeSlug ? vitrinePublicPath(storeSlug) : '/';

  return (
    <div className="seller-panel-layout">
      <aside className="seller-sidebar seller-sidebar--desktop" aria-label="Satıcı menyu">
        <div className="seller-sidebar-header">
          <Link href="/" className="brand" data-testid="link-brand-panel">
            <BrandLogo />
          </Link>
          <span className="seller-badge">Satıcı paneli</span>
        </div>

        <button
          type="button"
          className="seller-store-info seller-store-info--button"
          onClick={() => pickTab('store')}
          aria-label="Mağaza məlumatları"
          data-testid="button-store-settings"
        >
          {logoPath ? (
            <div className="store-avatar store-avatar--logo">
              <img src={sellerImageUrl(logoPath)} alt="" />
            </div>
          ) : (
            <div className="store-avatar">
              <Store size={20} />
            </div>
          )}
          <div>
            <strong>{storeName}</strong>
            <small>Mağaza məlumatları</small>
          </div>
        </button>

        <nav className="seller-nav">
          <button type="button" className={`seller-nav-item${active === 'overview' ? ' active' : ''}`} onClick={() => pickTab('overview')} data-testid="nav-overview">
            <LayoutDashboard size={18} /> İcmal
          </button>
          <button type="button" className={`seller-nav-item${active === 'products' ? ' active' : ''}`} onClick={() => pickTab('products')} data-testid="nav-products">
            <Package size={18} /> Məhsullar
            <span className="nav-count">{productCount}</span>
          </button>
          <button type="button" className={`seller-nav-item${active === 'store' ? ' active' : ''}`} onClick={() => pickTab('store')} data-testid="nav-store">
            <Settings size={18} /> Mağaza məlumatları
          </button>
          <Link href="/seller-orders" className={`seller-nav-item${active === 'orders' ? ' active' : ''}`} data-testid="nav-orders">
            <Truck size={18} /> Sifarişlər
          </Link>
        </nav>

        <div className="seller-sidebar-footer">
          <Link href="/" className="seller-nav-item" data-testid="link-back-storefront">
            <ArrowLeft size={18} /> Vitrinə qayıt
          </Link>
          <button type="button" className="seller-nav-item text-danger" onClick={onLogout} data-testid="button-logout">
            <LogOut size={18} /> Çıxış et
          </button>
        </div>
      </aside>

      <header className="seller-mobile-head" aria-label="Satıcı paneli">
        <div className="seller-mobile-head-row">
          <Link href="/" className="seller-mobile-eynek" data-testid="link-brand-panel-mobile">
            <span className="seller-mobile-eynek-dot" aria-hidden />
            <BrandWord className="seller-mobile-eynek-text" />
          </Link>
          {active === 'overview' && storeSlug ? (
            <Link href={vitrineHref} className="seller-mobile-head-chip" data-testid="link-seller-vitrine-mobile">
              <Eye size={14} aria-hidden /> Vitrinə bax
            </Link>
          ) : null}
          {active === 'store' ? <span className="seller-mobile-head-chip seller-mobile-head-chip--muted">Satıcı paneli</span> : null}
          {active === 'orders' ? <span className="seller-mobile-head-storename">{storeName}</span> : null}
        </div>

        {active === 'products' ? (
          <div className="seller-mobile-head-store">
            {onTab ? (
              <button type="button" className="seller-mobile-head-store-inner" onClick={() => pickTab('store')} data-testid="button-store-settings-mobile">
                <span className="seller-mobile-head-store-icon" aria-hidden>
                  {logoPath ? <img src={sellerImageUrl(logoPath)} alt="" /> : <Glasses size={22} strokeWidth={1.5} />}
                </span>
                <span className="seller-mobile-head-store-text">
                  <strong>{storeName}</strong>
                  <small>Satıcı paneli</small>
                </span>
              </button>
            ) : (
              <Link href="/seller-panel" className="seller-mobile-head-store-inner" data-testid="button-store-settings-mobile">
                <span className="seller-mobile-head-store-icon" aria-hidden>
                  {logoPath ? <img src={sellerImageUrl(logoPath)} alt="" /> : <Glasses size={22} strokeWidth={1.5} />}
                </span>
                <span className="seller-mobile-head-store-text">
                  <strong>{storeName}</strong>
                  <small>Satıcı paneli</small>
                </span>
              </Link>
            )}
          </div>
        ) : null}

        <nav className="seller-top-nav" aria-label="Əsas bölmələr">
          {onTab ? (
            <TabItem active={active === 'overview'} onClick={() => pickTab('overview')} icon={<LayoutGrid size={20} strokeWidth={1.75} />} label="İcmal" testId="nav-overview-mobile" />
          ) : (
            <TabItem active={false} href="/seller-panel" icon={<LayoutGrid size={20} strokeWidth={1.75} />} label="İcmal" testId="nav-overview-mobile" />
          )}
          {onTab ? (
            <TabItem active={active === 'products'} onClick={() => pickTab('products')} icon={<Package size={20} strokeWidth={1.75} />} label="Məhsullar" testId="nav-products-mobile" />
          ) : (
            <TabItem active={false} href="/seller-panel" icon={<Package size={20} strokeWidth={1.75} />} label="Məhsullar" testId="nav-products-mobile" />
          )}
          <TabItem active={active === 'orders'} href="/seller-orders" icon={<ShoppingBag size={20} strokeWidth={1.75} />} label="Sifarişlər" testId="nav-orders-mobile" />
          {onTab ? (
            <TabItem active={active === 'store'} onClick={() => pickTab('store')} icon={<Store size={20} strokeWidth={1.75} />} label="Mağaza" testId="nav-store-mobile" />
          ) : (
            <TabItem active={false} href="/seller-panel" icon={<Store size={20} strokeWidth={1.75} />} label="Mağaza" testId="nav-store-mobile" />
          )}
        </nav>
      </header>

      <main className="seller-main seller-main--mobile-shell">{children}</main>
    </div>
  );
}
