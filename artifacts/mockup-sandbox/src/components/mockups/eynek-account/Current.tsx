import './_group.css';
import { type ReactNode } from 'react';
import { ArrowRight, UserRound } from 'lucide-react';

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

export function Current() {
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
    <div className="app-shell min-h-screen">
      <main className="account-page">
        <div className="container">
          <div className="directory-header">
            <div><div className="eyebrow">Müştəri hesabı</div><h1>Hesabın.</h1></div>
            <p>Hesab yaratmaq istəyə bağlıdır. Qonaq kimi də sifariş verib izləyə bilərsən.</p>
          </div>
          <section className="account-panel">
            <UserRound size={20} />
            <h2><BrandWord /> hesabı</h2>
            {!isLoaded ? (
              <p role="status" data-testid="status-account-loading">Hesab məlumatları yüklənir…</p>
            ) : isSignedIn ? (
              <>
                <p data-testid="text-account-identity">{user?.fullName || email || 'EYNƏK.com alıcısı'} ilə daxil olmusunuz.</p>
                <div className="form-actions">
                  <button className="btn" type="button" onClick={() => openUserProfile()} data-testid="button-account-profile">Profil məlumatlarını idarə et</button>
                  <Link href="/wishlist" className="btn btn-secondary" data-testid="link-account-wishlist">Seçilmişlərə bax <ArrowRight size={14} /></Link>
                  <button className="btn btn-secondary" type="button" onClick={() => void signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} data-testid="button-account-sign-out">Çıxış et</button>
                </div>
              </>
            ) : (
              <>
                <p>Hesab açmaq istəyə bağlıdır — hesabla daxil olduqda öz sifariş tarixçənə və profil məlumatlarına bir yerdən baxa bilərsən.</p>
                <ul className="account-benefits">
                  <li>Sifarişləri və çatdırılma yeniliklərini bir yerdə gör.</li>
                  <li>Ad və e-poçt məlumatlarını Clerk profilindən idarə et.</li>
                </ul>
                <p className="account-guest-note">Hesab yaratmadan da qonaq kimi sifariş verə bilərsən; sifarişi təsdiq səhifəsindəki təhlükəsiz keçidlə izlə.</p>
                <div className="form-actions">
                  <Link href="/sign-in?redirect_url=%2Faccount" className="btn" data-testid="link-account-sign-in">Daxil ol <ArrowRight size={14} /></Link>
                  <Link href="/sign-up" className="btn btn-secondary" data-testid="link-account-sign-up">Hesab yarat</Link>
                  <Link href="/wishlist" className="btn btn-secondary" data-testid="link-account-wishlist">Seçilmişlərə bax</Link>
                </div>
              </>
            )}
          </section>

          {isLoaded && isSignedIn && (
            <section className="account-orders" aria-labelledby="account-orders-heading">
              <div className="account-orders-heading">
                <div><div className="eyebrow">Sifariş tarixçəsi</div><h2 id="account-orders-heading">Sifarişlərin</h2></div>
                <span data-testid="text-account-order-count">{orders.data?.length ?? 0} sifariş</span>
              </div>
              {orders.isLoading ? (
                <div className="empty-state-mini" role="status" data-testid="status-account-orders-loading">Sifarişlər yüklənir…</div>
              ) : orders.isError ? (
                <div className="google-index-note" role="alert" data-testid="status-account-orders-error">
                  Sifariş tarixçəsini yükləmək alınmadı. Yenidən yoxlayın.
                  <button className="text-link" type="button" onClick={() => void orders.refetch()} data-testid="button-account-orders-retry">Yenidən cəhd et</button>
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
                  Bu hesabla verilmiş sifariş yoxdur. Qonaq sifarişləri hesab tarixçəsinə əlavə olunmur.
                  <Link href="/collection" className="text-link" data-testid="link-account-empty-orders-shop">Eynəklərə bax <ArrowRight size={14} /></Link>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}