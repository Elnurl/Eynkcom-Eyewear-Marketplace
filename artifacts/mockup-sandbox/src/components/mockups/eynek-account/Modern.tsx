import './_group.css';
import './Modern.css';
import { type ReactNode } from 'react';
import { ArrowRight, Check, Glasses, Package, ShieldCheck, UserRound } from 'lucide-react';

type AccountOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAzN: number | null;
  createdAt: string;
};

function useUser() {
  return {
    isLoaded: true,
    isSignedIn: false,
    user: undefined as { primaryEmailAddress?: { emailAddress?: string }; fullName?: string } | undefined,
  };
}

function useClerk() {
  return { openUserProfile: () => undefined, signOut: async (_options?: { redirectUrl?: string }) => undefined };
}

function getListAccountOrdersQueryKey() {
  return ['account-orders'] as const;
}

function useListAccountOrders(_options: { query: { queryKey: readonly string[]; enabled: boolean; retry: boolean } }) {
  return {
    data: [] as AccountOrder[] | undefined,
    isLoading: false,
    isError: false,
    refetch: async () => undefined,
  };
}

function orderStatusLabel(status: string) {
  return status;
}

function formatOrderMoney(amount: number) {
  return `${amount.toFixed(2)} ₼`;
}

function dateLabel(date: string) {
  return date;
}

function Link({
  href,
  className,
  children,
  ...props
}: {
  href: string;
  className?: string;
  children: ReactNode;
  [key: string]: unknown;
}) {
  return <a href={href} className={className} {...props}>{children}</a>;
}

function BrandWord() {
  return (
    <span className="brand-word">
      <img src="/__mockup/images/eynek-name.png" width={476} height={86} alt="EYNƏK" />
    </span>
  );
}

function BrandLogo() {
  return (
    <img
      className="brand-image"
      src="/__mockup/images/eynek-wordmark.png"
      width={776}
      height={86}
      alt="EYNƏK.com"
    />
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div><div className="brand"><BrandLogo /></div><p>İstədiyin eynəklər bir platformada. Azərbaycandakı optikaları və çərçivələri bir yerdə kəşf et.</p></div>
        <div><h3>Kəşf et</h3><Link href="/collection">Eynəklər</Link><Link href="/brands">Brendlər</Link><Link href="/stores">Mağazalar</Link></div>
        <div><h3>Müştəri üçün</h3><Link href="/wishlist">Seçilmişlər</Link><Link href="/account">Hesab</Link><Link href="/collection">Çatdırılma məlumatı</Link></div>
        <div><h3>Satıcılar üçün</h3><Link href="/seller"><BrandWord />-də sat</Link><a href="mailto:sat@eynek.com">Bizimlə əlaqə</a><a href="#support">Dəstək</a></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} <BrandWord /></span><span>Bakı • Azərbaycan</span></div>
    </footer>
  );
}

export function Modern() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const orders = useListAccountOrders({
    query: {
      queryKey: getListAccountOrdersQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
      retry: false,
    },
  });
  const email = user?.primaryEmailAddress?.emailAddress;
  return (
    <>
      <main className="account-page">
        <div className="container account-wrap">
          <div className="account-intro">
            <div>
              <span className="account-kicker">Müştəri hesabı</span>
              <h1>Hesabın.</h1>
            </div>
            <p>Sifarişlərin və profilin üçün rahat bir məkan. Hesab açmaq isə tamamilə sənin seçimindir.</p>
          </div>
          <section className="account-panel" aria-label="Hesab məlumatları">
            <div className="account-feature">
              <div className="account-feature-top">
                <span className="account-feature-mark" aria-hidden="true"><Glasses size={22} strokeWidth={1.5} /></span>
                <span className="account-feature-index">EYNƏK.COM / HESAB</span>
              </div>
              <div className="account-feature-copy">
                <h2>{isLoaded && isSignedIn ? 'Yenidən xoş gəldin.' : 'Baxışın sənə məxsusdur.'}</h2>
                <p>{isLoaded && isSignedIn ? 'Bu hesabla verdiyin sifarişləri bir yerdən rahatlıqla izlə.' : 'Öz zövqünə uyğun çərçivələri kəşf et. İstəsən, sifarişlərini hesabından izlə.'}</p>
              </div>
              <div className="account-feature-bottom"><span>01</span><span aria-hidden="true">—</span><span>Sənin məkanın</span></div>
            </div>
            <div className="account-panel-content">
              <span className="account-card-kicker"><UserRound size={15} strokeWidth={1.8} /> Şəxsi məkan</span>
              {!isLoaded ? (
                <>
                  <h2>Hesabın hazırlanır</h2>
                  <div className="account-loading-skeleton" role="status" data-testid="status-account-loading" aria-label="Hesab məlumatları yüklənir">
                    <span /><span /><span />
                  </div>
                </>
              ) : isSignedIn ? (
                <>
                  <h2>Hesabına xoş gəldin.</h2>
                  <p className="account-identity" data-testid="text-account-identity">{user?.fullName || email || 'EYNƏK.com alıcısı'} ilə daxil olmusunuz.</p>
                  <ul className="account-benefits">
                    <li><Check size={16} strokeWidth={2} /> Sifariş tarixçənə aşağıdan bax</li>
                    <li><Check size={16} strokeWidth={2} /> Profil məlumatlarını istədiyin vaxt yenilə</li>
                  </ul>
                  <div className="account-actions">
                    <button className="btn account-primary" type="button" onClick={() => openUserProfile()} data-testid="button-account-profile">Profili idarə et <ArrowRight size={15} /></button>
                    <Link href="/wishlist" className="btn account-secondary" data-testid="link-account-wishlist">Seçilmişlərə bax</Link>
                  </div>
                  <button className="account-quiet-link" type="button" onClick={() => void signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} data-testid="button-account-sign-out">Hesabdan çıx</button>
                </>
              ) : (
                <>
                  <h2>Səni görmək xoşdur.</h2>
                  <p>Hesabına daxil ol, bu hesabla verdiyin sifarişlərə istədiyin vaxt qayıt.</p>
                  <ul className="account-benefits">
                    <li><Check size={16} strokeWidth={2} /> Sifarişlərini və çatdırılma yeniliklərini izlə</li>
                    <li><Check size={16} strokeWidth={2} /> Ad və e-poçt məlumatlarını profilindən idarə et</li>
                  </ul>
                  <div className="account-actions">
                    <Link href="/sign-in?redirect_url=%2Faccount" className="btn account-primary" data-testid="link-account-sign-in">Daxil ol <ArrowRight size={16} /></Link>
                    <Link href="/sign-up" className="btn account-secondary" data-testid="link-account-sign-up">Hesab yarat</Link>
                  </div>
                  <Link href="/wishlist" className="account-quiet-link" data-testid="link-account-wishlist">Seçilmişlərə bax <ArrowRight size={13} /></Link>
                </>
              )}
            </div>
          </section>

          {!isSignedIn && isLoaded && (
            <aside className="account-guest-note">
              <ShieldCheck size={20} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <strong>Hesab açmaq məcburi deyil.</strong>
                <p>Qonaq kimi də sifariş verə bilərsən. Sifarişini təsdiq səhifəsindəki təhlükəsiz keçidlə izlə.</p>
              </div>
            </aside>
          )}

          {isLoaded && isSignedIn && (
            <section className="account-orders" aria-labelledby="account-orders-heading">
              <div className="account-orders-heading">
                <div><span className="account-kicker">Sifariş tarixçəsi</span><h2 id="account-orders-heading">Sifarişlərin</h2></div>
                <span data-testid="text-account-order-count">{orders.data?.length ?? 0} sifariş</span>
              </div>
              {orders.isLoading ? (
                <div className="empty-state-mini account-orders-loading" role="status" data-testid="status-account-orders-loading" aria-label="Sifarişlər yüklənir"><span /><span /></div>
              ) : orders.isError ? (
                <div className="account-orders-error" role="alert" data-testid="status-account-orders-error">
                  <ShieldCheck size={20} aria-hidden="true" />
                  <span>Sifariş tarixçəsini yükləmək alınmadı. Yenidən yoxlayın.</span>
                  <button className="text-link" type="button" onClick={() => void orders.refetch()} data-testid="button-account-orders-retry">Yenidən cəhd et <ArrowRight size={14} /></button>
                </div>
              ) : orders.data?.length ? (
                <div className="account-order-list">
                  {orders.data.map((order) => (
                    <article className="account-order-card" key={order.id} data-testid={`card-account-order-${order.id}`}>
                      <div className="account-order-main">
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <span>{orderStatusLabel(order.status)}</span>
                        </div>
                        <div>
                          <strong>{order.totalAzN === null ? 'Məbləğ təsdiqlənir' : formatOrderMoney(order.totalAzN)}</strong>
                          <span>{dateLabel(order.createdAt)}</span>
                        </div>
                      </div>
                      <Link href={`/order/${order.id}`} className="text-link" data-testid={`link-account-order-${order.id}`}>
                        Sifarişə bax <ArrowRight size={14} />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state-mini" data-testid="status-account-orders-empty">
                  <Package size={20} strokeWidth={1.7} aria-hidden="true" />
                  <span>Hələ bu hesabla sifariş verməmisən. Qonaq sifarişləri hesab tarixçəsinə əlavə olunmur.</span>
                  <Link href="/collection" className="text-link" data-testid="link-account-empty-orders-shop">Eynəklərə bax <ArrowRight size={14} /></Link>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}