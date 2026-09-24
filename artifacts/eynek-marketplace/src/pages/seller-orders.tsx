import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Clipboard, LogOut, Package, RefreshCw, Store, Truck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  SellerOrderUpdateStatus,
  getListSellerOrdersQueryKey,
  useListSellerOrders,
  useUpdateSellerOrder,
} from '@workspace/api-client-react';
import type { SellerOrder, SellerOrderUpdate } from '@workspace/api-client-react';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { BrandLogo } from '@/components/brand-logo';
import { LoadingCard, QueryError, StatePill, dateLabel, money, paymentStatusLabel, sellerStatusLabel } from './order-ui';
import './order-pages.css';

type Draft = { status: SellerOrderUpdateStatus; deliveryFeeAzN: string; trackingCode: string; collectedAtDelivery: boolean };
const settlementLabels: Record<string, string> = {
  not_eligible: 'Hesablanmayıb',
  payable: 'Ödənişə hazırdır',
  settled: 'Ödənilib',
  adjusted: 'Geri ödənişə uyğunlaşdırılıb',
  reversed: 'Ləğv edilib',
};

function statusesFor(order: SellerOrder): SellerOrderUpdateStatus[] {
  if (order.status === 'pending_confirmation') return [SellerOrderUpdateStatus.confirmed, SellerOrderUpdateStatus.declined];
  if (order.status === 'confirmed') return [SellerOrderUpdateStatus.preparing];
  if (order.status === 'preparing') return [SellerOrderUpdateStatus.preparing, SellerOrderUpdateStatus.out_for_delivery];
  if (order.status === 'out_for_delivery') return [SellerOrderUpdateStatus.out_for_delivery, SellerOrderUpdateStatus.delivered];
  if (order.status === 'delivered') return [SellerOrderUpdateStatus.delivered];
  return [];
}

function errorText(error: unknown) {
  const response = error as { data?: { error?: string } };
  return response.data?.error ?? 'Dəyişiklik yadda saxlanmadı.';
}

export default function SellerOrdersPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const orders = useListSellerOrders({ query: { enabled: isLoaded && Boolean(isSignedIn), queryKey: getListSellerOrdersQueryKey(), retry: false } });
  const updateOrder = useUpdateSellerOrder();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation(`/sign-in?redirect_url=${encodeURIComponent('/seller-orders')}`);
  }, [isLoaded, isSignedIn, setLocation]);

  const sellerOrders = orders.data ?? [];
  const totalEarnings = useMemo(() => sellerOrders.reduce((sum, order) => sum + (order.sellerEarningsAzN ?? 0), 0), [sellerOrders]);
  const openOrders = sellerOrders.filter((order) => !['delivered', 'cancelled', 'declined'].includes(order.status)).length;

  const draftFor = (order: SellerOrder): Draft => drafts[order.id] ?? {
    status: order.status === 'pending_confirmation' ? SellerOrderUpdateStatus.confirmed : (statusesFor(order)[0] ?? SellerOrderUpdateStatus.confirmed),
    deliveryFeeAzN: order.deliveryFeeAzN === null ? '' : String(order.deliveryFeeAzN),
    trackingCode: order.trackingCode ?? '',
    collectedAtDelivery: ['payable', 'settled', 'adjusted', 'reversed'].includes(order.settlementStatus),
  };

  const setDraft = (id: string, patch: Partial<Draft>) => setDrafts((current) => ({ ...current, [id]: { ...draftFor(sellerOrders.find((item) => item.id === id) as SellerOrder), ...current[id], ...patch } }));

  const save = async (order: SellerOrder) => {
    const draft = draftFor(order);
    setError('');
    setSavedId('');
    const data: SellerOrderUpdate = {
      status: draft.status,
      ...(draft.deliveryFeeAzN.trim() ? { deliveryFeeAzN: Number(draft.deliveryFeeAzN) } : {}),
      ...(draft.trackingCode.trim() ? { trackingCode: draft.trackingCode.trim() } : {}),
      collectedAtDelivery: draft.collectedAtDelivery,
    };
    try {
      await updateOrder.mutateAsync({ id: order.id, data });
      await queryClient.invalidateQueries({ queryKey: getListSellerOrdersQueryKey() });
      setSavedId(order.id);
    } catch (saveError) {
      setError(errorText(saveError));
    }
  };

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="seller-panel-layout">
      <aside className="seller-sidebar">
        <div className="seller-sidebar-header"><Link href="/" className="brand" data-testid="link-seller-orders-brand"><BrandLogo /></Link><span className="seller-badge">Satıcı Paneli</span></div>
        <div className="seller-store-info"><div className="store-avatar"><Store size={20} /></div><div><strong>Sifarişlər</strong><small>{user?.primaryEmailAddress?.emailAddress}</small></div></div>
        <nav className="seller-nav"><Link href="/seller-panel" className="seller-nav-item"><Package size={18} /> Məhsullar</Link><Link href="/seller-orders" className="seller-nav-item active"><Truck size={18} /> Sifarişlər</Link></nav>
        <div className="seller-sidebar-footer"><Link href="/" className="seller-nav-item">Vitrinə qayıt</Link><button className="seller-nav-item text-danger" onClick={() => void signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} data-testid="button-seller-orders-logout"><LogOut size={18} /> Çıxış et</button></div>
      </aside>
      <main className="seller-main">
        <div className="seller-content">
          <div className="management-toolbar"><div><div className="eyebrow">Mağaza əməliyyatları</div><h1>Sifarişlər.</h1></div><p>Mağazanıza aid sifarişləri təsdiqləyin, çatdırılma haqqını və izləmə kodunu yeniləyin.</p></div>
          <div className="stat-strip"><div className="stat-tile"><small>Açıq sifarişlər</small><strong>{openOrders}</strong></div><div className="stat-tile"><small>Ümumi sifariş</small><strong>{sellerOrders.length}</strong></div><div className="stat-tile"><small>Qazanc</small><strong>{money(totalEarnings)}</strong></div></div>
          {error && <div className="commerce-error" role="alert" data-testid="status-seller-order-error"><AlertCircle size={16} />{error}</div>}
          {orders.isLoading ? <LoadingCard lines={5} /> : orders.isError ? <QueryError message="Sifarişlər yüklənmədi." onRetry={() => void orders.refetch()} /> : sellerOrders.length ? (
            <div className="admin-order-list" style={{ marginTop: 16 }}>
              {sellerOrders.map((order) => {
                const draft = draftFor(order);
                return <article className="commerce-card seller-order-card" key={order.id} data-testid={`card-seller-order-${order.id}`}>
                  <div className="seller-order-top"><div><strong>{order.orderNumber}</strong><small>{order.customerName} · {dateLabel(order.updatedAt)}</small></div><StatePill status={order.status} label={sellerStatusLabel(order.status)} /></div>
                  <div style={{ display: 'grid', gap: 5, padding: '15px 0 3px', color: '#707b87', fontSize: 11 }}><span><strong style={{ color: '#2b3540' }}>Çatdırılma:</strong> {order.deliveryArea}, {order.deliveryAddress}</span><span><strong style={{ color: '#2b3540' }}>Ödəniş:</strong> {paymentStatusLabel(order.paymentStatus)}</span></div>
                  <div className="order-items">{order.items.map((item) => <div className="order-item-row" key={item.productId}><span><strong>{item.productName}</strong> · {item.quantity} ədəd</span><span>{money(item.lineTotalAzN)}</span></div>)}</div>
                  <div className="order-meta-grid"><div><small>Məhsullar</small><strong>{money(order.productSubtotalAzN)}</strong></div><div><small>Çatdırılma</small><strong>{money(order.deliveryFeeAzN)}</strong></div><div><small>Komissiya</small><strong>{money(order.commissionAzN)}</strong></div><div><small>Qazanc</small><strong>{money(order.sellerEarningsAzN)}</strong></div><div><small>Hesablaşma</small><strong>{settlementLabels[order.settlementStatus] ?? 'Hesablanmayıb'}</strong></div></div>
                  <div className="order-actions"><div className="commerce-field"><label htmlFor={`status-${order.id}`}>Status</label><select id={`status-${order.id}`} data-testid={`select-seller-order-status-${order.id}`} value={draft.status} disabled={!statusesFor(order).length} onChange={(event) => setDraft(order.id, { status: event.target.value as SellerOrderUpdateStatus })}>{statusesFor(order).map((status) => <option value={status} key={status}>{sellerStatusLabel(status)}</option>)}</select></div><div className="commerce-field"><label htmlFor={`fee-${order.id}`}>Çatdırılma haqqı</label><input id={`fee-${order.id}`} type="number" min="0" max="1000" step="0.01" value={draft.deliveryFeeAzN} disabled={order.status !== 'pending_confirmation'} onChange={(event) => setDraft(order.id, { deliveryFeeAzN: event.target.value })} data-testid={`input-seller-delivery-fee-${order.id}`} /></div><div className="commerce-field"><label htmlFor={`tracking-${order.id}`}>İzləmə kodu</label><input id={`tracking-${order.id}`} maxLength={120} value={draft.trackingCode} disabled={!['preparing', 'out_for_delivery', 'delivered'].includes(order.status)} placeholder="Məsələn: AZ-2841" onChange={(event) => setDraft(order.id, { trackingCode: event.target.value })} data-testid={`input-seller-tracking-${order.id}`} /></div>{order.paymentMethod === 'pay_on_delivery' && draft.status === 'delivered' && <label className="collection-check"><input type="checkbox" checked={draft.collectedAtDelivery} disabled={order.settlementStatus !== 'not_eligible'} onChange={(event) => setDraft(order.id, { collectedAtDelivery: event.target.checked })} data-testid={`checkbox-collected-at-delivery-${order.id}`} /><span>Nağd ödənişi almışam</span></label>}<button className="btn btn-blue" type="button" onClick={() => void save(order)} disabled={updateOrder.isPending || !statusesFor(order).length} data-testid={`button-save-seller-order-${order.id}`}>{savedId === order.id ? <Check size={15} /> : <RefreshCw size={15} />} {savedId === order.id ? 'Yadda saxlanıldı' : 'Yadda saxla'}</button></div>
                  {draft.trackingCode && <span className="tracking-badge"><Clipboard size={13} /> {draft.trackingCode}</span>}
                </article>;
              })}
            </div>
          ) : <div className="empty-state" data-testid="status-seller-orders-loaded"><Package size={22} /><h3>Hələ sifariş yoxdur.</h3><p>Mağazanız üçün yeni sifarişlər burada görünəcək.</p></div>}
        </div>
      </main>
    </div>
  );
}