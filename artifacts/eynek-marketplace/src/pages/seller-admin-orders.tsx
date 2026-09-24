import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CircleDollarSign, ClipboardList, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListAdminOrdersQueryKey,
  useListAdminOrders,
  useRecordOrderRefund,
} from '@workspace/api-client-react';
import type { AdminOrder, OrderRefundInput } from '@workspace/api-client-react';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { BrandLogo } from '@/components/brand-logo';
import { LoadingCard, QueryError, StatePill, dateLabel, money, orderStatusLabel, paymentStatusLabel, sellerStatusLabel } from './order-ui';
import './order-pages.css';

type RefundDraft = { sellerOrderId: string; amount: string; productAmount: string; reference: string; reason: string };

function errorText(error: unknown) {
  const response = error as { data?: { error?: string } };
  return response.data?.error ?? 'Geri ödəniş qeydə alınmadı.';
}

export default function SellerAdminOrdersPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const orders = useListAdminOrders({ query: { enabled: isLoaded && Boolean(isSignedIn), queryKey: getListAdminOrdersQueryKey(), retry: false } });
  const recordRefund = useRecordOrderRefund();
  const [drafts, setDrafts] = useState<Record<string, RefundDraft>>({});
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation(`/sign-in?redirect_url=${encodeURIComponent('/seller-admin/orders')}`);
  }, [isLoaded, isSignedIn, setLocation]);

  const list = orders.data ?? [];
  const totalGross = useMemo(() => list.reduce((sum, order) => sum + (order.totalAzN ?? 0), 0), [list]);
  const totalRefunded = useMemo(() => list.reduce((sum, order) => sum + order.refundedAzN, 0), [list]);
  const draftFor = (order: AdminOrder): RefundDraft => drafts[order.id] ?? {
    sellerOrderId: order.sellerOrders.find((seller) => seller.status === 'delivered')?.id ?? '',
    amount: '',
    productAmount: '',
    reference: '',
    reason: '',
  };
  const setDraft = (id: string, patch: Partial<RefundDraft>) => setDrafts((current) => ({ ...current, [id]: { ...draftFor(list.find((item) => item.id === id) as AdminOrder), ...current[id], ...patch } }));

  const refund = async (order: AdminOrder) => {
    const draft = draftFor(order);
    const seller = order.sellerOrders.find((item) => item.id === draft.sellerOrderId);
    setError('');
    setSavedId('');
    const input: OrderRefundInput = {
      sellerOrderId: draft.sellerOrderId,
      refundAmountAzN: Number(draft.amount),
      productRefundAzN: Number(draft.productAmount),
      reference: draft.reference.trim(),
      ...(draft.reason.trim() ? { reason: draft.reason.trim() } : {}),
    };
    if (!seller || !input.refundAmountAzN || input.refundAmountAzN <= 0 || !input.reference || !Number.isFinite(input.productRefundAzN)) {
      setError('Mağaza, məbləğlər və istinad kodu tələb olunur.');
      return;
    }
    const sellerRemaining = Math.max((seller.productSubtotalAzN + (seller.deliveryFeeAzN ?? 0)) - seller.refundedAzN, 0);
    const productRemaining = Math.max(seller.productSubtotalAzN - seller.productRefundedAzN, 0);
    if (input.refundAmountAzN > sellerRemaining || input.productRefundAzN < 0 || input.productRefundAzN > input.refundAmountAzN || input.productRefundAzN > productRemaining) {
      setError('Geri ödəniş məbləği mağaza sifarişində qalan məbləğdən çox ola bilməz.');
      return;
    }
    try {
      await recordRefund.mutateAsync({ id: order.id, data: input });
      await queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      setDrafts((current) => ({ ...current, [order.id]: { ...draft, amount: '', productAmount: '', reference: '', reason: '' } }));
      setSavedId(order.id);
    } catch (refundError) {
      setError(errorText(refundError));
    }
  };

  if (!isLoaded || !isSignedIn) return null;

  return <div className="seller-panel-layout">
    <aside className="seller-sidebar">
      <div className="seller-sidebar-header"><Link href="/" className="brand" data-testid="link-admin-orders-brand"><BrandLogo /></Link><span className="seller-badge">Marketplace Admin</span></div>
      <div className="seller-store-info"><div className="store-avatar"><ShieldCheck size={20} /></div><div><strong>İdarəetmə</strong><small>{user?.primaryEmailAddress?.emailAddress}</small></div></div>
      <nav className="seller-nav"><Link href="/seller-admin" className="seller-nav-item"><ShieldCheck size={18} /> Yoxlama</Link><Link href="/seller-admin/orders" className="seller-nav-item active"><ClipboardList size={18} /> Sifarişlər</Link></nav>
      <div className="seller-sidebar-footer"><Link href="/" className="seller-nav-item">Mağazaya qayıt</Link><button className="seller-nav-item text-danger" onClick={() => void signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} data-testid="button-admin-orders-logout"><LogOut size={18} /> Çıxış et</button></div>
    </aside>
    <main className="seller-main"><div className="seller-content">
      <div className="management-toolbar"><div><div className="eyebrow">Maliyyə nəzarəti</div><h1>Sifarişlər və geri ödənişlər.</h1></div><p>Bütün marketplace sifarişlərinin ödəniş statusunu, mağaza bölgüsünü və geri ödəniş qeydlərini idarə edin.</p></div>
      <div className="stat-strip"><div className="stat-tile"><small>Sifarişlər</small><strong>{list.length}</strong></div><div className="stat-tile"><small>Brüt məbləğ</small><strong>{money(totalGross)}</strong></div><div className="stat-tile"><small>Geri qaytarılıb</small><strong>{money(totalRefunded)}</strong></div></div>
      {error && <div className="commerce-error" role="alert" data-testid="status-admin-order-error"><AlertCircle size={16} />{error}</div>}
      {orders.isLoading ? <LoadingCard lines={6} /> : orders.isError ? <QueryError message="Admin sifarişləri yüklənmədi." onRetry={() => void orders.refetch()} /> : list.length ? <div className="admin-order-list" style={{ marginTop: 16 }}>{list.map((order) => {
        const draft = draftFor(order);
        const refundSeller = order.sellerOrders.find((item) => item.id === draft.sellerOrderId);
        const remaining = refundSeller ? Math.max((refundSeller.productSubtotalAzN + (refundSeller.deliveryFeeAzN ?? 0)) - refundSeller.refundedAzN, 0) : 0;
        const productRemaining = refundSeller ? Math.max(refundSeller.productSubtotalAzN - refundSeller.productRefundedAzN, 0) : 0;
        return <article className="commerce-card admin-order-card" key={order.id} data-testid={`card-admin-order-${order.id}`}>
          <div className="admin-order-heading"><div><h2>{order.orderNumber}</h2><p>{order.customerName} · {order.customerEmail} · {dateLabel(order.createdAt)}</p></div><StatePill status={order.status} label={orderStatusLabel(order.status)} /></div>
          <div className="admin-order-values"><div><small>Müştəri</small><strong>{order.customerPhone}</strong></div><div><small>Ödəniş</small><strong>{paymentStatusLabel(order.paymentStatus)}</strong></div><div><small>Yekun</small><strong>{money(order.totalAzN)}</strong></div><div><small>Geri qaytarılıb</small><strong>{money(order.refundedAzN)}</strong></div></div>
          <div className="order-items">{order.sellerOrders.map((seller) => <div className="order-item-row" key={seller.id}><span><strong>{seller.sellerName}</strong> · {seller.items.length} məhsul · {sellerStatusLabel(seller.status)}</span><span>{money(seller.productSubtotalAzN)}</span></div>)}</div>
          <div className="refund-box"><div className="commerce-field"><label htmlFor={`refund-seller-${order.id}`}>Mağaza</label><select id={`refund-seller-${order.id}`} value={draft.sellerOrderId} onChange={(event) => setDraft(order.id, { sellerOrderId: event.target.value, amount: '', productAmount: '' })} data-testid={`select-refund-seller-${order.id}`}><option value="">Çatdırılmış mağazanı seçin</option>{order.sellerOrders.filter((seller) => seller.status === 'delivered').map((seller) => <option value={seller.id} key={seller.id}>{seller.sellerName} · qalan {money(Math.max(seller.productSubtotalAzN + (seller.deliveryFeeAzN ?? 0) - seller.refundedAzN, 0))}</option>)}</select></div><div className="commerce-field"><label htmlFor={`refund-amount-${order.id}`}>Ümumi məbləğ · qalan {money(remaining)}</label><input id={`refund-amount-${order.id}`} type="number" min="0.01" max={remaining} step="0.01" value={draft.amount} onChange={(event) => setDraft(order.id, { amount: event.target.value })} data-testid={`input-refund-amount-${order.id}`} /></div><div className="commerce-field"><label htmlFor={`refund-product-amount-${order.id}`}>Məhsula aid hissə · qalan {money(productRemaining)}</label><input id={`refund-product-amount-${order.id}`} type="number" min="0" max={productRemaining} step="0.01" value={draft.productAmount} onChange={(event) => setDraft(order.id, { productAmount: event.target.value })} data-testid={`input-refund-product-amount-${order.id}`} /></div><div className="commerce-field"><label htmlFor={`refund-reference-${order.id}`}>İstinad</label><input id={`refund-reference-${order.id}`} maxLength={160} value={draft.reference} onChange={(event) => setDraft(order.id, { reference: event.target.value })} placeholder="REF-2025-01" data-testid={`input-refund-reference-${order.id}`} /></div><div className="commerce-field"><label htmlFor={`refund-reason-${order.id}`}>Səbəb</label><input id={`refund-reason-${order.id}`} maxLength={500} value={draft.reason} onChange={(event) => setDraft(order.id, { reason: event.target.value })} placeholder="Qısa izah" data-testid={`input-refund-reason-${order.id}`} /></div><button className="btn btn-blue" type="button" onClick={() => void refund(order)} disabled={recordRefund.isPending || remaining <= 0 || !refundSeller || !['paid_on_delivery', 'captured', 'partially_refunded'].includes(order.paymentStatus)} data-testid={`button-record-refund-${order.id}`}>{savedId === order.id ? <RefreshCw size={15} /> : <CircleDollarSign size={15} />} {savedId === order.id ? 'Qeydə alındı' : 'Geri ödənişi qeyd et'}</button></div>
          <p className="refund-note">Geri ödənişi yalnız təsdiqlənmiş maliyyə əməliyyatından sonra qeyd edin. Bu düymə kart ödənişi yaratmır və yalnız backend-də verilən qeydi saxlayır.</p>
        </article>;
      })}</div> : <div className="empty-state"><ClipboardList size={22} /><h3>Hələ sifariş qeydi yoxdur.</h3><p>Marketplace sifarişləri yarandıqca burada görünəcək.</p></div>}
    </div></main>
  </div>;
}