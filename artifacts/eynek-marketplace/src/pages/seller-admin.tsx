import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertCircle, Check, ClipboardList, LogOut, Mail, ShieldCheck, Users } from 'lucide-react';
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
type AdminSection = 'applications' | 'products' | 'users' | 'newsletter';
type SupportTicket = {
  id: string;
  sellerId: string | null;
  authorType: string;
  storeName: string | null;
  authorEmail: string;
  authorName: string | null;
  authorPhone: string | null;
  message: string;
  imagePath: string | null;
  status: string;
  adminReadAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type InquirySummary = {
  pendingApplications: number;
  unreadSupportTickets: number;
  totalUnread: number;
};
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

function reviewDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('az-AZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function sectionFromLocation(): AdminSection {
  const id = window.location.hash.replace('#', '');
  if (id === 'products' || id === 'users' || id === 'newsletter' || id === 'applications') return id;
  return 'applications';
}

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
    query: { queryKey: getListAdminSellerApplicationsQueryKey(), enabled: isAdmin, retry: false, refetchOnMount: 'always', refetchOnWindowFocus: true, refetchInterval: 15000 },
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
  const [subscribers, setSubscribers] = useState<Array<{ id: string; email: string; createdAt: string }>>([]);
  const [section, setSection] = useState<AdminSection>(sectionFromLocation);
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'seller' | 'buyer'>('all');
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [inquirySummary, setInquirySummary] = useState<InquirySummary | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const openSection = (id: AdminSection) => {
    setSection(id);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash);
  };

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

  useEffect(() => {
    if (!isAdmin) return;
    void fetch('/api/admin/newsletter', { credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : []))
      .then((rows: Array<{ id: string; email: string; createdAt: string }>) => {
        if (Array.isArray(rows)) setSubscribers(rows);
      })
      .catch(() => undefined);
  }, [isAdmin]);

  const loadInquiries = () => {
    if (!isAdmin) return;
    void fetch('/api/admin/inquiries/summary', { credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((summary: InquirySummary | null) => {
        if (summary && typeof summary.totalUnread === 'number') setInquirySummary(summary);
      })
      .catch(() => undefined);
    if (section === 'users') {
      setSupportLoading(true);
      void fetch('/api/admin/support-tickets', { credentials: 'include' })
        .then(async (response) => (response.ok ? response.json() : []))
        .then((rows: SupportTicket[]) => {
          if (Array.isArray(rows)) setSupportTickets(rows);
        })
        .catch(() => undefined)
        .finally(() => setSupportLoading(false));
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadInquiries();
    const timer = window.setInterval(loadInquiries, 15000);
    return () => window.clearInterval(timer);
  }, [isAdmin, section]);

  const markSupportRead = async (id: string) => {
    await fetch(`/api/admin/support-tickets/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markRead: true }),
    });
    setSupportTickets((rows) => rows.map((row) => (row.id === id ? { ...row, adminReadAt: new Date().toISOString() } : row)));
    loadInquiries();
  };

  const closeSupportTicket = async (id: string) => {
    await fetch(`/api/admin/support-tickets/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed', markRead: true }),
    });
    setSupportTickets((rows) => rows.map((row) => (row.id === id ? { ...row, status: 'closed', adminReadAt: new Date().toISOString() } : row)));
    loadInquiries();
  };

  const supportImageUrl = (path: string) => (path.startsWith('/objects/') ? `/api/storage${path}` : path);

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
          <button type="button" className={`seller-nav-item ${section === 'applications' ? 'active' : ''}`} onClick={() => openSection('applications')}><ShieldCheck size={18} /> Satıcı müraciətləri {(inquirySummary?.pendingApplications ?? 0) > 0 ? <span className="nav-count nav-count--alert">{inquirySummary?.pendingApplications}</span> : null}</button>
          <button type="button" className={`seller-nav-item ${section === 'products' ? 'active' : ''}`} onClick={() => openSection('products')}><Check size={18} /> Məhsul yoxlaması</button>
          <button type="button" className={`seller-nav-item ${section === 'users' ? 'active' : ''}`} onClick={() => openSection('users')}><Users size={18} /> İstifadəçilər {(inquirySummary?.unreadSupportTickets ?? 0) > 0 ? <span className="nav-count nav-count--alert">{inquirySummary?.unreadSupportTickets}</span> : <span className="nav-count">{users.data?.length ?? 0}</span>}</button>
          <button type="button" className={`seller-nav-item ${section === 'newsletter' ? 'active' : ''}`} onClick={() => openSection('newsletter')}><Mail size={18} /> Abunələr <span className="nav-count">{subscribers.length}</span></button>
          <Link className="seller-nav-item" href="/seller-admin/orders"><ClipboardList size={18} /> Sifarişlər</Link>
        </nav>
        <div className="seller-sidebar-footer">
          <Link href="/" className="seller-nav-item">Mağazaya qayıt</Link>
          <button className="seller-nav-item text-danger" onClick={() => void signOutAndGo('/')}><LogOut size={18} /> Çıxış et</button>
        </div>
      </aside>

      <main className="seller-main" ref={mainRef}>
        <div className="seller-content">
          <header className="seller-main-header">
            <h1>Marketplace yoxlaması</h1>
            <p>Satıcı müraciətlərini və ictimai kataloqa çıxacaq məhsulları nəzərdən keçirin.</p>
          </header>
          {(actionError || adminError) && (
            <div className="google-index-note" role="alert"><AlertCircle size={16} />{actionError || errorMessage(adminError)}</div>
          )}

          {section === 'applications' && <section id="applications" className="seller-panel-section">
            <h2>Satıcı müraciətləri {applications.data ? `(${applications.data.filter((application) => application.status !== 'rejected').length})` : ''}</h2>
            {applications.isLoading && !applications.data ? <div className="empty-state-mini">Müraciətlər yüklənir...</div> : (() => {
              const rows = (applications.data ?? []).filter((application) => application.status !== 'rejected').sort((a, b) => {
                const open = (status: string) => status === 'pending' || status === 'needs_changes' ? 0 : 1;
                const byStatus = open(a.status) - open(b.status);
                if (byStatus !== 0) return byStatus;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });
              if (!rows.length) return <div className="empty-state-mini">Yoxlanacaq satıcı müraciəti yoxdur.</div>;
              return (
                <div className="admin-review-list" data-testid="log-seller-applications" style={{ display: 'grid', gap: 14 }}>
                  {rows.map((application, index) => {
                    const open = application.status === 'pending' || application.status === 'needs_changes';
                    return (
                      <article className="admin-review-card" key={`${application.id}-${index}`} style={{ display: 'grid', gap: 14, padding: 20, background: '#fff', color: '#171A3A', border: '1px solid #E6E6E2', borderRadius: 12 }}>
                        <div className="admin-review-heading">
                          <div><h3>{application.storeName}</h3><span>{application.ownerName} · {application.email} · {application.phone}</span></div>
                          <span className={`status-badge ${open ? 'pending' : application.status === 'approved' ? 'active' : 'draft'}`}>{applicationStatusLabel[application.status] ?? application.status}</span>
                        </div>
                        <p>{reviewDate(application.createdAt)} · {application.business}</p>
                        <div className="admin-review-details">
                          <span><strong>Ünvan:</strong> {application.address}</span>
                          <span><strong>Kateqoriyalar:</strong> {application.categories}</span>
                          {application.tax && <span><strong>VÖEN:</strong> {application.tax}</span>}
                          {application.instagram && <span><strong>Instagram:</strong> {application.instagram}</span>}
                          {application.website && <span><strong>Veb:</strong> {application.website}</span>}
                          {application.reviewNotes && <span><strong>Qeyd:</strong> {application.reviewNotes}</span>}
                        </div>
                        {open && (
                          <>
                            <textarea
                              aria-label={`${application.storeName} üçün baxış qeydi`}
                              placeholder="Satıcıya göstəriləcək qeyd"
                              value={applicationNotes[application.id] ?? application.reviewNotes ?? ''}
                              onChange={(event) => setApplicationNotes((notes) => ({ ...notes, [application.id]: event.target.value }))}
                            />
                            <div className="admin-review-actions">
                              {(['approved', 'needs_changes', 'rejected'] as ApplicationStatus[]).map((status) => (
                                <button
                                  key={status}
                                  className={status === 'approved' ? 'btn btn-blue' : 'btn btn-secondary'}
                                  disabled={reviewApplication.isPending}
                                  onClick={() => {
                                    if (status === 'rejected' && !window.confirm(`${application.storeName} müraciəti silinsin?`)) return;
                                    void saveApplicationStatus(application.id, status);
                                  }}
                                >
                                  {status === 'rejected' ? 'Sil' : applicationStatusLabel[status]}
                                </button>
                              ))}
                            </div>
                            <small className="field-help">Təsdiqdən əvvəl müraciətdəki e-poçtla hesab yaradılmalı və ən azı bir dəfə daxil olunmalıdır.</small>
                          </>
                        )}
                        {application.status === 'approved' && (
                          <div className="admin-review-actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={reviewApplication.isPending}
                              onClick={() => {
                                if (window.confirm(`${application.storeName} mağazası siyahıdan silinsin?`)) {
                                  void saveApplicationStatus(application.id, 'rejected');
                                }
                              }}
                            >
                              Mağazanı sil
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              );
            })()}
          </section>}

          {section === 'products' && <section id="products" className="seller-panel-section">
            <h2>Məhsul yoxlaması {products.data ? `(${products.data.length})` : ''}</h2>
            {products.isLoading && !products.data ? <div className="empty-state-mini">Məhsullar yüklənir...</div> : (() => {
              const openProducts = products.data?.filter((product) => product.approvalStatus === 'pending' || product.approvalStatus === 'needs_changes') ?? [];
              const decidedProducts = [...(products.data?.filter((product) => product.approvalStatus === 'approved' || product.approvalStatus === 'rejected') ?? [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
              if (!products.data?.length) return <div className="empty-state-mini">Yoxlanacaq məhsul yoxdur.</div>;
              return (
                <>
                  {openProducts.length ? (
                    <div className="admin-review-list">
                      {openProducts.map((product) => (
                        <article className="admin-review-card" key={product.id}>
                          <div className="admin-review-heading">
                            <div><h3>{product.name}</h3><span>{product.brand || 'Brendsiz'} · {product.category} · {product.price} AZN · stok: {product.stock} · {product.status}</span></div>
                            <span className={`status-badge ${product.approvalStatus === 'needs_changes' ? 'pending' : 'draft'}`}>{productStatusLabel[product.approvalStatus]}</span>
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
                  ) : <div className="empty-state-mini">Açıq məhsul yoxlaması yoxdur.</div>}
                  {decidedProducts.length > 0 && (
                    <div className="admin-log" data-testid="log-seller-products">
                      <h3 className="admin-log-title">Qərar jurnalı</h3>
                      {decidedProducts.map((product) => (
                        <article className="admin-log-row" key={product.id}>
                          <time dateTime={reviewDate(product.updatedAt)}>{reviewDate(product.updatedAt)}</time>
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.brand || 'Brendsiz'} · {product.price} AZN</span>
                            {product.moderationNote && <p>Qeyd: {product.moderationNote}</p>}
                          </div>
                          <span className={`status-badge ${product.approvalStatus === 'approved' ? 'active' : 'draft'}`}>{productStatusLabel[product.approvalStatus]}</span>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </section>}

          {section === 'users' && <section id="users" className="seller-panel-section">
            <h2>İstifadəçilər {users.data ? `(${users.data.length})` : ''}</h2>

            <div className="admin-inquiries-block" data-testid="section-admin-inquiries">
              <div className="admin-inquiries-head">
                <h3>Sorğular</h3>
                {(inquirySummary?.unreadSupportTickets ?? 0) > 0 && (
                  <span className="admin-inquiries-badge" data-testid="badge-inquiries-unread">{inquirySummary?.unreadSupportTickets} yeni</span>
                )}
              </div>
              <p className="field-help" style={{ marginTop: 0 }}>Satıcı paneli və saytdakı daxil olmuş istifadəçilərin EYNƏK-ə yazdığı mesajlar. Yeni satıcı müraciətləri ayrıca «Satıcı müraciətləri» tabındadır.</p>
              <div className="admin-inquiry-tabs" role="tablist" aria-label="Sorğu filtri">
                <button type="button" role="tab" aria-selected={inquiryFilter === 'all'} className={inquiryFilter === 'all' ? 'is-on' : ''} onClick={() => setInquiryFilter('all')} data-testid="tab-inquiries-all">Hamısı</button>
                <button type="button" role="tab" aria-selected={inquiryFilter === 'seller'} className={inquiryFilter === 'seller' ? 'is-on' : ''} onClick={() => setInquiryFilter('seller')} data-testid="tab-inquiries-seller">Satıcı</button>
                <button type="button" role="tab" aria-selected={inquiryFilter === 'buyer'} className={inquiryFilter === 'buyer' ? 'is-on' : ''} onClick={() => setInquiryFilter('buyer')} data-testid="tab-inquiries-buyer">Alıcı</button>
              </div>

              {(() => {
                const filtered = supportTickets.filter((ticket) => inquiryFilter === 'all' || ticket.authorType === inquiryFilter);
                if (supportLoading && !supportTickets.length) return <div className="empty-state-mini">Sorğular yüklənir...</div>;
                if (!filtered.length) return <div className="empty-state-mini">Bu filtr üzrə sorğu yoxdur.</div>;
                return (
                  <div className="admin-review-list">
                    {filtered.map((ticket) => {
                      const unread = !ticket.adminReadAt && ticket.status === 'open';
                      const title = ticket.authorName?.trim()
                        || (ticket.authorType === 'seller' ? (ticket.storeName ?? 'Satıcı') : 'Alıcı');
                      const subtitleParts = [
                        ticket.authorPhone?.trim(),
                        ticket.authorEmail,
                        ticket.authorType === 'seller' ? 'Satıcı' : 'Alıcı',
                      ].filter(Boolean);
                      const subtitle = subtitleParts.join(' · ');
                      return (
                        <article className={`admin-review-card${unread ? ' admin-review-card--unread' : ''}`} key={ticket.id} data-testid={`card-support-ticket-${ticket.id}`} onClick={() => { if (unread) void markSupportRead(ticket.id); }}>
                          <div className="admin-review-heading">
                            <div><h3>{title}</h3><span>{subtitle} · {reviewDate(ticket.createdAt)}</span></div>
                            <span className={`status-badge ${ticket.status === 'open' ? (unread ? 'pending' : 'draft') : 'active'}`}>{ticket.status === 'closed' ? 'Bağlanıb' : unread ? 'Yeni' : 'Oxunub'}</span>
                          </div>
                          <p className="admin-support-message">{ticket.message}</p>
                          {ticket.imagePath ? (
                            <a className="admin-support-image-link" href={supportImageUrl(ticket.imagePath)} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
                              <img src={supportImageUrl(ticket.imagePath)} alt="Əlavə şəkil" />
                            </a>
                          ) : null}
                          {ticket.status === 'open' && (
                            <div className="admin-review-actions" onClick={(event) => event.stopPropagation()}>
                              <button type="button" className="btn btn-secondary" onClick={() => void closeSupportTicket(ticket.id)} data-testid={`button-close-support-${ticket.id}`}>Bağla</button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <h3 className="admin-users-subtitle">Hesab siyahısı</h3>
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
          </section>}

          {section === 'newsletter' && <section id="newsletter" className="seller-panel-section">
            <h2>Abunələr {`(${subscribers.length})`}</h2>
            {subscribers.length ? (
              <div className="admin-review-list">
                {subscribers.map((subscriber) => (
                  <article className="admin-review-card" key={subscriber.id}>
                    <div className="admin-review-heading">
                      <div><h3>{subscriber.email}</h3><span>{reviewDate(subscriber.createdAt)}</span></div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state-mini">Hələ abunə yoxdur.</div>}
          </section>}
        </div>
      </main>
    </div>
  );
}