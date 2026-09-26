import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertCircle, Check, ClipboardList, LogOut, ShieldCheck, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminAccessQueryKey,
  getListAdminUsersQueryKey,
  getListAdminProductsQueryKey,
  getListAdminSellerApplicationsQueryKey,
  getListProductsQueryKey,
  getListStoresQueryKey,
  useListAdminProducts,
  useListAdminSellerApplications,
  useGetAdminAccess,
  useListAdminUsers,
  useReviewSellerApplication,
  useReviewSellerProduct,
} from '@workspace/api-client-react';
import { signOutAndGo, useAuthSession } from '@/lib/auth-client';
import { BrandLogo } from '@/components/brand-logo';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes';
type ProductStatus = 'approved' | 'rejected' | 'needs_changes';

const applicationStatusLabel: Record<ApplicationStatus, string> = {
  pending: 'Gözləmədə',
  approved: 'Təsdiqləndi',
  rejected: 'Rədd edildi',
  needs_changes: 'Dəyişiklik tələb olunur',
};

const productStatusLabel: Record<ProductStatus | 'pending', string> = {
  pending: 'Yoxlamada',
  approved: 'Təsdiqləndi',
  rejected: 'Rədd edildi',
  needs_changes: 'Dəyişiklik tələb olunur',
};

const accountTypeLabel = { admin: 'Marketplace admin', seller: 'Satıcı', buyer: 'Alıcı' } as const;

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  return 'Sorğu tamamlanmadı. Yenidən cəhd edin.';
}

export default function SellerAdminPage() {
  const { isLoaded, isSignedIn, user } = useAuthSession();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const adminAccess = useGetAdminAccess({
    query: {
      queryKey: getGetAdminAccessQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
      retry: false,
    },
  });
  const isAdmin = adminAccess.data?.authorized === true;
  const applications = useListAdminSellerApplications(undefined, {
    query: { queryKey: getListAdminSellerApplicationsQueryKey(), enabled: isAdmin, retry: false },
  });
  const products = useListAdminProducts(undefined, {
    query: { queryKey: getListAdminProductsQueryKey(), enabled: isAdmin, retry: false },
  });
  const users = useListAdminUsers({
    query: { queryKey: getListAdminUsersQueryKey(), enabled: isAdmin, retry: false },
  });
  const reviewApplication = useReviewSellerApplication();
  const reviewProduct = useReviewSellerProduct();
  const [applicationNotes, setApplicationNotes] = useState<Record<string, string>>({});
  const [productNotes, setProductNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation(`/sign-in?redirect_url=${encodeURIComponent('/seller-admin')}`);
      return;
    }
    const status = (adminAccess.error as { status?: number } | null)?.status;
    if (status === 403) setLocation('/account');
    if (status === 401) setLocation(`/sign-in?redirect_url=${encodeURIComponent('/seller-admin')}`);
  }, [adminAccess.error, isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || !isSignedIn) return null;
  if (!isAdmin) {
    if (adminAccess.isLoading) return null;
    return (
      <main className="account-page">
        <div className="container">
          <div className="google-index-note" role="alert" data-testid="status-admin-access-error">{errorMessage(adminAccess.error)}</div>
          <Link href="/account" className="btn btn-secondary">Hesaba qayıt</Link>
        </div>
      </main>
    );
  }

  const saveApplicationStatus = async (id: string, status: ApplicationStatus) => {
    setActionError('');
    try {
      await reviewApplication.mutateAsync({
        id,
        data: { status, reviewNotes: applicationNotes[id]?.trim() || null },
      });
      await queryClient.invalidateQueries({ queryKey: getListAdminSellerApplicationsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const saveProductStatus = async (id: string, approvalStatus: ProductStatus) => {
    setActionError('');
    try {
      await reviewProduct.mutateAsync({
        id,
        data: { approvalStatus, moderationNote: productNotes[id]?.trim() || null },
      });
      await queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const adminError = applications.error || products.error || users.error;

  return (
    <div className="seller-panel-layout">
      <aside className="seller-sidebar">
        <div className="seller-sidebar-header">
          <Link href="/" className="brand"><BrandLogo /></Link>
          <span className="seller-badge">Marketplace Admin</span>
        </div>
        <div className="seller-store-info">
          <div className="store-avatar"><ShieldCheck size={20} /></div>
          <div><strong>İdarəetmə</strong><small>{user?.email}</small></div>
        </div>
        <nav className="seller-nav">
          <a className="seller-nav-item active" href="#applications"><ShieldCheck size={18} /> Satıcı müraciətləri</a>
          <a className="seller-nav-item" href="#products"><Check size={18} /> Məhsul yoxlaması</a>
          <a className="seller-nav-item" href="#users"><Users size={18} /> İstifadəçilər <span className="nav-count">{users.data?.length ?? 0}</span></a>
          <Link className="seller-nav-item" href="/seller-admin/orders"><ClipboardList size={18} /> Sifarişlər</Link>
        </nav>
        <div className="seller-sidebar-footer">
          <Link href="/" className="seller-nav-item">Mağazaya qayıt</Link>
          <button className="seller-nav-item text-danger" onClick={() => void signOutAndGo('/')}><LogOut size={18} /> Çıxış et</button>
        </div>
      </aside>

      <main className="seller-main">
        <div className="seller-content">
          <header className="seller-main-header">
            <h1>Marketplace yoxlaması</h1>
            <p>Satıcı müraciətlərini və ictimai kataloqa çıxacaq məhsulları nəzərdən keçirin.</p>
          </header>
          {(actionError || adminError) && (
            <div className="google-index-note" role="alert"><AlertCircle size={16} />{actionError || errorMessage(adminError)}</div>
          )}

          <section id="applications" className="seller-panel-section">
            <h2>Satıcı müraciətləri {applications.data ? `(${applications.data.length})` : ''}</h2>
            {applications.isLoading ? <div className="empty-state-mini">Müraciətlər yüklənir...</div> : applications.data?.length ? (
              <div className="admin-review-list">
                {applications.data.map((application) => (
                  <article className="admin-review-card" key={application.id}>
                    <div className="admin-review-heading">
                      <div><h3>{application.storeName}</h3><span>{application.ownerName} · {application.email} · {application.phone}</span></div>
                      <span className={`status-badge ${application.status === 'approved' ? 'active' : 'draft'}`}>{applicationStatusLabel[application.status]}</span>
                    </div>
                    <p>{application.business}</p>
                    <div className="admin-review-details">
                      <span><strong>Ünvan:</strong> {application.address}</span>
                      <span><strong>Kateqoriyalar:</strong> {application.categories}</span>
                      {application.tax && <span><strong>VÖEN:</strong> {application.tax}</span>}
                      {application.instagram && <span><strong>Instagram:</strong> {application.instagram}</span>}
                      {application.website && <span><strong>Veb:</strong> {application.website}</span>}
                    </div>
                    <textarea
                      aria-label={`${application.storeName} üçün baxış qeydi`}
                      placeholder="Satıcıya göstəriləcək qeyd"
                      value={applicationNotes[application.id] ?? application.reviewNotes ?? ''}
                      onChange={(event) => setApplicationNotes((notes) => ({ ...notes, [application.id]: event.target.value }))}
                    />
                    <div className="admin-review-actions">
                      {(['approved', 'needs_changes', 'rejected', 'pending'] as ApplicationStatus[]).map((status) => (
                        <button
                          key={status}
                          className={status === 'approved' ? 'btn btn-blue' : 'btn btn-secondary'}
                          disabled={reviewApplication.isPending}
                          onClick={() => saveApplicationStatus(application.id, status)}
                        >
                          {applicationStatusLabel[status]}
                        </button>
                      ))}
                    </div>
                    {application.status === 'pending' && (
                      <small className="field-help">Təsdiqdən əvvəl müraciətdəki e-poçtla hesab yaradılmalı və ən azı bir dəfə daxil olunmalıdır.</small>
                    )}
                  </article>
                ))}
              </div>
            ) : <div className="empty-state-mini">Yoxlanacaq satıcı müraciəti yoxdur.</div>}
          </section>

          <section id="products" className="seller-panel-section">
            <h2>Məhsul yoxlaması {products.data ? `(${products.data.length})` : ''}</h2>
            {products.isLoading ? <div className="empty-state-mini">Məhsullar yüklənir...</div> : products.data?.length ? (
              <div className="admin-review-list">
                {products.data.map((product) => (
                  <article className="admin-review-card" key={product.id}>
                    <div className="admin-review-heading">
                      <div><h3>{product.name}</h3><span>{product.brand || 'Brendsiz'} · {product.category} · {product.price} AZN · stok: {product.stock} · {product.status}</span></div>
                      <span className={`status-badge ${product.approvalStatus === 'approved' ? 'active' : 'draft'}`}>{productStatusLabel[product.approvalStatus]}</span>
                    </div>
                    <p>{product.description || `${product.color} · ${product.material} · ${product.shape} · ${product.size}`}</p>
                    {product.moderationNote && <p><strong>Əvvəlki qeyd:</strong> {product.moderationNote}</p>}
                    <textarea
                      aria-label={`${product.name} üçün moderasiya qeydi`}
                      placeholder="Satıcıya göstəriləcək qeyd"
                      value={productNotes[product.id] ?? product.moderationNote ?? ''}
                      onChange={(event) => setProductNotes((notes) => ({ ...notes, [product.id]: event.target.value }))}
                    />
                    <div className="admin-review-actions">
                      {(['approved', 'needs_changes', 'rejected'] as ProductStatus[]).map((status) => (
                        <button
                          key={status}
                          className={status === 'approved' ? 'btn btn-blue' : 'btn btn-secondary'}
                          disabled={reviewProduct.isPending}
                          onClick={() => saveProductStatus(product.id, status)}
                        >
                          {productStatusLabel[status]}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state-mini">Yoxlanacaq məhsul yoxdur.</div>}
          </section>

          <section id="users" className="seller-panel-section">
            <h2>İstifadəçilər {users.data ? `(${users.data.length})` : ''}</h2>
            {users.isLoading ? <div className="empty-state-mini">İstifadəçilər yüklənir...</div> : users.data?.length ? (
              <div className="admin-review-list">
                {users.data.map((account) => (
                  <article className="admin-review-card" key={account.id} data-testid={`card-admin-user-${account.id}`}>
                    <div className="admin-review-heading">
                      <div>
                        <h3>{account.name || 'Ad göstərilməyib'}</h3>
                        <span>{account.email || 'E-poçt göstərilməyib'}</span>
                      </div>
                      <span className={`status-badge ${account.accountType === 'admin' ? 'active' : 'draft'}`}>{accountTypeLabel[account.accountType]}</span>
                    </div>
                    <small className="field-help">Qeydiyyat tarixi: {new Intl.DateTimeFormat('az-AZ').format(new Date(account.createdAt))}</small>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state-mini">İstifadəçi hesabı tapılmadı.</div>}
          </section>
        </div>
      </main>
    </div>
  );
}