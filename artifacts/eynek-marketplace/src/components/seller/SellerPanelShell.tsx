import type { ReactNode } from 'react';
import { ArrowLeft, Eye, Glasses, LayoutDashboard, LayoutGrid, LogOut, Package, Settings, ShoppingBag, Store, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { BrandLogo, BrandWord } from '@/components/brand-logo';
import { sellerImageUrl } from '@/lib/seller-images';
import { vitrinePublicPath } from '@/pages/vitrine';

export type SellerPanelTab = 'overview' | 'products' | 'store' | 'orders';

const SELLER_PANEL_HREF: Record<Exclude<SellerPanelTab, 'orders'>, string> = {
  overview: '/seller-panel?tab=overview',
  products: '/seller-panel?tab=products',
  store: '/seller-panel?tab=store',
};

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

function NavItem({
  active,
  onClick,
  href,
  icon,
  label,
  testId,
  className = 'seller-nav-item',
  count,
}: {
  active: boolean;
  onClick?: () => void;
  href?: string;
  icon: ReactNode;
  label: string;
  testId: string;
  className?: string;
  count?: number;
}) {
  const classes = `${className}${active ? ' active' : ''}`;
  const body = (
    <>
      {icon} {label}
      {count !== undefined ? <span className="nav-count">{count}</span> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes} data-testid={testId}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick} data-testid={testId}>
      {body}
    </button>
  );
}

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
  return (
    <NavItem
      active={active}
      onClick={onClick}
      href={href}
      icon={icon}
      label={label}
      testId={testId}
      className="seller-top-nav-item"
    />
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

        {onTab ? (
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
        ) : (
          <Link
            href={SELLER_PANEL_HREF.store}
            className="seller-store-info seller-store-info--button"
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
          </Link>
        )}

        <nav className="seller-nav">
          <NavItem
            active={active === 'overview'}
            onClick={onTab ? () => pickTab('overview') : undefined}
            href={onTab ? undefined : SELLER_PANEL_HREF.overview}
            icon={<LayoutDashboard size={18} />}
            label="İcmal"
            testId="nav-overview"
          />
          <NavItem
            active={active === 'products'}
            onClick={onTab ? () => pickTab('products') : undefined}
            href={onTab ? undefined : SELLER_PANEL_HREF.products}
            icon={<Package size={18} />}
            label="Məhsullar"
            testId="nav-products"
            count={productCount}
          />
          <NavItem
            active={active === 'store'}
            onClick={onTab ? () => pickTab('store') : undefined}
            href={onTab ? undefined : SELLER_PANEL_HREF.store}
            icon={<Settings size={18} />}
            label="Mağaza məlumatları"
            testId="nav-store"
          />
          <NavItem
            active={active === 'orders'}
            href="/seller-orders"
            icon={<Truck size={18} />}
            label="Sifarişlər"
            testId="nav-orders"
          />
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
          <TabItem
            active={active === 'overview'}
            onClick={onTab ? () => pickTab('overview') : undefined}
            href={onTab ? undefined : SELLER_PANEL_HREF.overview}
            icon={<LayoutGrid size={20} strokeWidth={1.75} />}
            label="İcmal"
            testId="nav-overview-mobile"
          />
          <TabItem
            active={active === 'products'}
            onClick={onTab ? () => pickTab('products') : undefined}
            href={onTab ? undefined : SELLER_PANEL_HREF.products}
            icon={<Package size={20} strokeWidth={1.75} />}
            label="Məhsullar"
            testId="nav-products-mobile"
          />
          <TabItem active={active === 'orders'} href="/seller-orders" icon={<ShoppingBag size={20} strokeWidth={1.75} />} label="Sifarişlər" testId="nav-orders-mobile" />
          <TabItem
            active={active === 'store'}
            onClick={onTab ? () => pickTab('store') : undefined}
            href={onTab ? undefined : SELLER_PANEL_HREF.store}
            icon={<Store size={20} strokeWidth={1.75} />}
            label="Mağaza"
            testId="nav-store-mobile"
          />
        </nav>
      </header>

      <main className="seller-main seller-main--mobile-shell">{children}</main>
    </div>
  );
}
