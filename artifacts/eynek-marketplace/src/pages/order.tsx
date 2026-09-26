import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ClipboardCheck, Package, RotateCcw, ShieldCheck, Store, X } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { useAuthSession } from '@/lib/auth-client';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetGuestOrderQueryKey,
  useCreateOrderReturnRequest,
  useDecideGuestOrderRevision,
  useGetGuestOrder,
} from '@workspace/api-client-react';
import type { BuyerOrder, BuyerSellerOrderSummary } from '@workspace/api-client-react';
import { BrandLogo } from '@/components/brand-logo';
import { LoadingCard, QueryError, StatePill, dateLabel, fulfillmentLabel, money, orderStatusLabel, paymentStatusLabel, returnStatusLabel, sellerStatusLabel } from './order-ui';
import './order-pages.css';

function initialToken(orderId: string) {
  if (typeof window === 'undefined') return '';
  const fragment = window.location.hash.replace(/^#/, '');
  const fragmentParams = new URLSearchParams(fragment);
  const token = fragmentParams.get('token') ?? fragmentParams.get('accessToken') ?? (/^[a-f0-9]{64}$/i.test(fragment) ? fragment : '');
  return token || sessionStorage.getItem(`eynek:order-token:${orderId}`) || '';
}

function orderIdFromLocation(path: string) {
  const match = /^\/order\/([^/?#]+)/.exec(path);
  if (!match?.[1]) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function OrderPage() {
  const [location] = useLocation();
  const { orderId: routeOrderId = '' } = useParams<{ orderId: string }>();
  const orderId = routeOrderId || orderIdFromLocation(location);
  const { isLoaded, isSignedIn } = useAuthSession();
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState(() => initialToken(orderId));
  const [tokenInput, setTokenInput] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [returnDrafts, setReturnDrafts] = useState<Record<string, { reason: string; note: string }>>({});
  const [returnError, setReturnError] = useState('');
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const accountAccess = isLoaded && Boolean(isSignedIn);
  const queryKey = useMemo(() => [...getGetGuestOrderQueryKey(orderId), accessToken], [orderId, accessToken]);
  const order = useGetGuestOrder(orderId, {
    query: { enabled: Boolean(orderId && (accessToken || accountAccess)), queryKey, retry: false },
    request: { headers: accessToken ? { 'X-Order-Access-Token': accessToken } : {} },
  });
  const decideRevision = useDecideGuestOrderRevision({
    request: { headers: accessToken ? { 'X-Order-Access-Token': accessToken } : {} },
  });
  const createReturn = useCreateOrderReturnRequest({
    request: { headers: accessToken ? { 'X-Order-Access-Token': accessToken } : {} },
  });

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!/^[a-f0-9]{64}$/i.test(token)) return;
    sessionStorage.setItem(`eynek:order-token:${orderId}`, token);
    setAccessToken(token);
    setTokenInput('');
  };

  const decide = async (approve: boolean) => {
    setDecisionError('');
    try {
      const updated = await decideRevision.mutateAsync({ orderId, data: { approve } });
      queryClient.setQueryData(queryKey, updated);
    } catch (error) {
      const response = error as { data?: { error?: string } };
      setDecisionError(response.data?.error ?? 'Qərarınız yadda saxlanmadı. Yenidən cəhd edin.');
    }
  };

  const submitReturn = async (seller: BuyerSellerOrderSummary) => {
    const draft = returnDrafts[seller.id] ?? { reason: '', note: '' };
    setReturnError('');
    if (draft.reason.trim().length < 8) {
      setReturnError('Qaytarma səbəbini qısa da olsa yazın.');
      return;
    }
    try {
      const updated = await createReturn.mutateAsync({
        orderId,
        data: {
          sellerOrderId: seller.id,
          reason: draft.reason.trim(),
          ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        },
      });
      queryClient.setQueryData(queryKey, updated);
      setReturnDrafts((current) => ({ ...current, [seller.id]: { reason: '', note: '' } }));
      setReturnFor(null);
    } catch (error) {
      const response = error as { data?: { error?: string } };
      setReturnError(response.data?.error ?? 'Qaytarma sorğusu göndərilmədi.');
    }
  };

  const forgetToken = () => {
    sessionStorage.removeItem(`eynek:order-token:${orderId}`);
    setAccessToken('');
  };

  if (!isLoaded || (accountAccess && !accessToken && order.isLoading)) {
    return <main className="commerce-page"><div className="commerce-wrap"><LoadingCard lines={3} /></div></main>;
  }

  if (!accessToken && (!accountAccess || order.isError)) {
    return <main className="commerce-page"><div className="commerce-wrap"><div className="access-card commerce-card"><BrandLogo /><div className="eyebrow" style={{ marginTop: 30 }}>Sifarişə giriş</div><h1 style={{ margin: '8px 0 8px', color: '#171b22', fontSize: 34, letterSpacing: '-.06em' }}>Sifariş izləmə kodunu daxil et.</h1><p style={{ color: '#78828d', fontSize: 12, lineHeight: 1.6 }}>Bu ünvanda kod yoxdur. Sifarişi bitirəndə ünvanın sonunda, # işarəsindən sonra gələn 64 simvolu bura yaz. Sifarişdəki e-poçtla daxil olanda kod lazım olmur.</p><form onSubmit={unlock}><input aria-label="Sifariş giriş kodu" data-testid="input-order-access-token" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="64 simvolluq kod" /><button className="btn btn-blue" type="submit" data-testid="button-unlock-order">Aç</button></form><Link href="/" className="text-link" style={{ marginTop: 20 }} data-testid="link-order-home"><ArrowLeft size={13} /> Mağazaya qayıt</Link></div></div></main>;
  }

  return <main className="commerce-page"><div className="commerce-wrap">
    <header className="commerce-header"><div><Link href="/" className="brand" data-testid="link-order-brand"><BrandLogo /></Link><div className="eyebrow" style={{ marginTop: 25 }}>{accessToken ? 'Qonaq sifariş izləmə' : 'Hesab sifariş tarixçəsi'}</div><h1>Sifarişin haradadır?</h1></div><p>Sifarişiniz bir neçə optik mağazadan ibarətdirsə, hər mağazanın hazırlıq və ya götürmə mərhələsini ayrıca görə bilərsiniz.</p></header>
    {order.isLoading ? <LoadingCard lines={6} /> : order.isError || !order.data ? <div><QueryError message="Sifariş tapılmadı və ya giriş kodu düzgün deyil." onRetry={() => void order.refetch()} /><button className="btn btn-secondary" type="button" style={{ marginTop: 12 }} onClick={forgetToken}>Kodu yenidən yaz</button></div> : (
      <>
        <section className="commerce-card order-hero"><div><div className="order-number">SİFARİŞ {order.data.orderNumber}</div><h1>{orderStatusLabel(order.data.status, order.data.fulfillmentMethod)}</h1><p>Yaradılıb: {dateLabel(order.data.createdAt)} · {fulfillmentLabel(order.data.fulfillmentMethod)} · {order.data.deliveryArea}</p></div><StatePill status={order.data.status} label={orderStatusLabel(order.data.status, order.data.fulfillmentMethod)} /></section>
        {order.data.status === 'awaiting_buyer_approval' && <section className="commerce-card commerce-card-pad" style={{ marginTop: 16 }}><div className="commerce-card-heading"><div><h2>Yenilənmiş sifariş təsdiqinizi gözləyir</h2><p>Mağazalardan biri məhsul və ya çatdırılma detallarını dəyişib. Sifarişi təsdiqləyin və ya ləğv edin.</p></div><ClipboardCheck size={19} color="#9b5c36" /></div><div style={{ display: 'flex', gap: 9, marginTop: 18, flexWrap: 'wrap' }}><button className="btn btn-blue" disabled={decideRevision.isPending} onClick={() => void decide(true)} data-testid="button-approve-revision"><Check size={15} /> {decideRevision.isPending ? 'Göndərilir...' : 'Yenilənmiş sifarişi təsdiqlə'}</button><button className="btn btn-secondary" disabled={decideRevision.isPending} onClick={() => void decide(false)} data-testid="button-cancel-revision"><RotateCcw size={15} /> Sifarişi ləğv et</button></div>{decisionError && <QueryError message={decisionError} />}</section>}
        <div className="commerce-grid" style={{ marginTop: 16 }}>
          <div>
            <section className="commerce-card commerce-card-pad"><div className="commerce-card-heading"><div><h2>Sifariş mərhələləri</h2><p>Son yeniliklər mağazaların təsdiqləmələrinə əsasən yenilənir.</p></div><Package size={19} color="#5b719a" /></div><div className="timeline">{order.data.timeline.map((event, index) => <div className="timeline-row" key={`${event.createdAt}-${index}`} data-testid={`timeline-event-${index}`}><div><strong>{event.label}</strong></div><time>{dateLabel(event.createdAt)}</time></div>)}</div></section>
            <section className="commerce-card commerce-card-pad"><div className="commerce-card-heading"><div><h2>Mağaza sifarişləri</h2><p>Sifarişinizdəki mağazalar və məhsullar. Qaytarma sorğusu birbaşa mağazaya yox, EYNƏK-ə gedir.</p></div><Store size={19} color="#5b719a" /></div>            <div className="seller-summary">{order.data.sellerOrders.map((seller) => {
              return <article key={seller.id} className="seller-order-card commerce-card" data-testid={`card-buyer-seller-order-${seller.id}`}>
                <div className="seller-order-top"><div><strong>{seller.sellerName}</strong><small>{seller.items.length} məhsul</small></div><StatePill status={seller.status} label={sellerStatusLabel(seller.status, (order.data as BuyerOrder).fulfillmentMethod)} /></div>
                <div className="order-items">{seller.items.map((item) => <div className="order-item-row" key={item.productId}><span><strong>{item.productName}</strong> · {item.quantity} ədəd</span><span>{money(item.lineTotalAzN)}</span></div>)}</div>
                {seller.trackingCode && <span className="tracking-badge">İzləmə kodu: {seller.trackingCode}</span>}
                {seller.returnRequest ? (
                  <div className="return-box" data-testid={`status-return-request-${seller.id}`}>
                    <strong>Qaytarma sorğusu</strong>
                    <StatePill status={seller.returnRequest.status} label={returnStatusLabel(seller.returnRequest.status)} />
                    <p>{seller.returnRequest.reason}</p>
                    <small>Bu sorğu geri ödəniş yaratmır. EYNƏK mağaza ilə razılaşdırır.</small>
                  </div>
                ) : seller.status === 'delivered' ? (
                  <button type="button" className="return-link" onClick={() => { setReturnError(''); setReturnFor(seller.id); }} data-testid={`button-open-return-${seller.id}`}>Qaytarma sorğusu</button>
                ) : null}
              </article>;
            })}</div></section>
          </div>
          <aside>
            <section className="commerce-card commerce-card-pad"><div className="commerce-card-heading"><div><h2>Məlumatlar</h2><p>{accessToken ? 'Qonaq sifarişi' : 'Hesab sifarişi'}</p></div><ShieldCheck size={19} color="#5b719a" /></div><dl className="sidebar-summary" style={{ padding: '18px 0 0' }}><div><dt>Üsul</dt><dd>{fulfillmentLabel(order.data.fulfillmentMethod)}</dd></div><div><dt>Müştəri</dt><dd>{order.data.customerName}</dd></div><div><dt>Telefon</dt><dd>{order.data.customerPhone}</dd></div><div><dt>{order.data.fulfillmentMethod === 'store_pickup' ? 'Götürmə yeri' : 'Ünvan'}</dt><dd style={{ textAlign: 'right', maxWidth: 170 }}>{order.data.deliveryAddress}</dd></div><div><dt>Ödəniş</dt><dd>{paymentStatusLabel(order.data.paymentStatus, order.data.fulfillmentMethod)}</dd></div></dl></section>
            <section className="commerce-card commerce-card-pad" style={{ marginTop: 16 }}><div className="commerce-card-heading"><div><h2>Yekun məbləğ</h2><p>{order.data.fulfillmentMethod === 'store_pickup' ? 'Mağazadan götürmə pulsuzdur.' : 'Mağazalar təsdiq etdikcə dəqiqləşir.'}</p></div></div><div className="summary-lines"><div className="summary-line"><span>Məhsullar</span><strong>{money(order.data.productSubtotalAzN)}</strong></div><div className="summary-line"><span>Çatdırılma</span><strong>{order.data.fulfillmentMethod === 'store_pickup' ? money(0) : money(order.data.deliveryTotalAzN)}</strong></div><div className="summary-line total"><span>Cəmi</span><strong>{money(order.data.totalAzN)}</strong></div></div></section>
          </aside>
        </div>
        {(() => {
          const seller = order.data.sellerOrders.find((item) => item.id === returnFor);
          if (!seller) return null;
          const draft = returnDrafts[seller.id] ?? { reason: '', note: '' };
          return (
            <div className="tryon-backdrop" role="dialog" aria-modal="true" aria-label="Qaytarma sorğusu" onClick={(event) => { if (event.target === event.currentTarget) setReturnFor(null); }}>
              <form className="return-dialog" onSubmit={(event) => { event.preventDefault(); void submitReturn(seller); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                  <div><h2>Qaytarma sorğusu</h2><p>Sorğunu EYNƏK-ə göndərin. Geri ödəniş müddəti hələ razılaşdırılmayıb.</p></div>
                  <button type="button" className="icon-button" onClick={() => setReturnFor(null)} aria-label="Sorğunu bağla"><X size={18} /></button>
                </div>
                <div className="commerce-field"><label htmlFor={`return-reason-${seller.id}`}>Səbəb</label><textarea id={`return-reason-${seller.id}`} required minLength={8} maxLength={400} value={draft.reason} onChange={(event) => setReturnDrafts((current) => ({ ...current, [seller.id]: { ...draft, reason: event.target.value } }))} data-testid={`input-return-reason-${seller.id}`} /></div>
                <div className="commerce-field"><label htmlFor={`return-note-${seller.id}`}>Əlavə qeyd <span style={{ color: '#87909c', fontWeight: 500 }}>(istəyə görə)</span></label><textarea id={`return-note-${seller.id}`} maxLength={500} value={draft.note} onChange={(event) => setReturnDrafts((current) => ({ ...current, [seller.id]: { ...draft, note: event.target.value } }))} data-testid={`input-return-note-${seller.id}`} /></div>
                {returnError && <QueryError message={returnError} />}
                <button className="btn btn-blue" type="submit" disabled={createReturn.isPending} data-testid={`button-submit-return-${seller.id}`}>{createReturn.isPending ? 'Göndərilir...' : 'EYNƏK-ə göndər'}</button>
              </form>
            </div>
          );
        })()}
      </>
    )}
  </div></main>;
}