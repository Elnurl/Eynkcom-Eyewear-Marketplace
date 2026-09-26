import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ClipboardCheck, Package, RotateCcw, ShieldCheck, Store } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { useAuthSession } from '@/lib/auth-client';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetGuestOrderQueryKey,
  useDecideGuestOrderRevision,
  useGetGuestOrder,
} from '@workspace/api-client-react';
import { BrandLogo } from '@/components/brand-logo';
import { LoadingCard, QueryError, StatePill, dateLabel, money, orderStatusLabel, paymentStatusLabel, sellerStatusLabel } from './order-ui';
import './order-pages.css';

function initialToken(orderId: string) {
  if (typeof window === 'undefined') return '';
  const fragment = window.location.hash.replace(/^#/, '');
  const fragmentParams = new URLSearchParams(fragment);
  const token = fragmentParams.get('token') ?? fragmentParams.get('accessToken') ?? (/^[a-f0-9]{64}$/i.test(fragment) ? fragment : '');
  return token || sessionStorage.getItem(`eynek:order-token:${orderId}`) || '';
}

export default function OrderPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { isLoaded, isSignedIn } = useAuthSession();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState(() => initialToken(orderId));
  const [tokenInput, setTokenInput] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const accountAccess = isLoaded && Boolean(isSignedIn);
  const queryKey = useMemo(() => [...getGetGuestOrderQueryKey(orderId), accessToken], [orderId, accessToken]);
  const order = useGetGuestOrder(orderId, {
    query: { enabled: Boolean(orderId && (accessToken || accountAccess)), queryKey, retry: false },
    request: { headers: accessToken ? { 'X-Order-Access-Token': accessToken } : {} },
  });
  const decideRevision = useDecideGuestOrderRevision({
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

  if (!isLoaded) {
    return <main className="commerce-page"><div className="commerce-wrap"><LoadingCard lines={3} /></div></main>;
  }

  if (!accessToken && !accountAccess) {
    return <main className="commerce-page"><div className="commerce-wrap"><div className="access-card commerce-card"><BrandLogo /><div className="eyebrow" style={{ marginTop: 30 }}>Sifarişə giriş</div><h1 style={{ margin: '8px 0 8px', color: '#171b22', fontSize: 34, letterSpacing: '-.06em' }}>Sifariş izləmə kodunu daxil et.</h1><p style={{ color: '#78828d', fontSize: 12, lineHeight: 1.6 }}>Sifariş yaradılarkən sizə verilən 64 simvolluq giriş kodu bu səhifəni qoruyur.</p><form onSubmit={unlock}><input aria-label="Sifariş giriş kodu" data-testid="input-order-access-token" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="64 simvolluq kod" /><button className="btn btn-blue" type="submit" data-testid="button-unlock-order">Aç</button></form><Link href="/" className="text-link" style={{ marginTop: 20 }} data-testid="link-order-home"><ArrowLeft size={13} /> Mağazaya qayıt</Link></div></div></main>;
  }

  return <main className="commerce-page"><div className="commerce-wrap">
    <header className="commerce-header"><div><Link href="/" className="brand" data-testid="link-order-brand"><BrandLogo /></Link><div className="eyebrow" style={{ marginTop: 25 }}>{accessToken ? 'Qonaq sifariş izləmə' : 'Hesab sifariş tarixçəsi'}</div><h1>Sifarişin haradadır?</h1></div><p>Sifarişiniz bir neçə optik mağazadan ibarətdirsə, hər mağazanın hazırlıq mərhələsini ayrıca görə bilərsiniz.</p></header>
    {order.isLoading ? <LoadingCard lines={6} /> : order.isError || !order.data ? <QueryError message="Sifariş tapılmadı və ya giriş kodu düzgün deyil." onRetry={() => void order.refetch()} /> : (
      <>
        <section className="commerce-card order-hero"><div><div className="order-number">SİFARİŞ {order.data.orderNumber}</div><h1>{orderStatusLabel(order.data.status)}</h1><p>Yaradılıb: {dateLabel(order.data.createdAt)} · {order.data.deliveryArea}</p></div><StatePill status={order.data.status} label={orderStatusLabel(order.data.status)} /></section>
        {order.data.status === 'awaiting_buyer_approval' && <section className="commerce-card commerce-card-pad" style={{ marginTop: 16 }}><div className="commerce-card-heading"><div><h2>Yenilənmiş sifariş təsdiqinizi gözləyir</h2><p>Mağazalardan biri məhsul və ya çatdırılma detallarını dəyişib. Sifarişi təsdiqləyin və ya ləğv edin.</p></div><ClipboardCheck size={19} color="#9b5c36" /></div><div style={{ display: 'flex', gap: 9, marginTop: 18, flexWrap: 'wrap' }}><button className="btn btn-blue" disabled={decideRevision.isPending} onClick={() => void decide(true)} data-testid="button-approve-revision"><Check size={15} /> {decideRevision.isPending ? 'Göndərilir...' : 'Yenilənmiş sifarişi təsdiqlə'}</button><button className="btn btn-secondary" disabled={decideRevision.isPending} onClick={() => void decide(false)} data-testid="button-cancel-revision"><RotateCcw size={15} /> Sifarişi ləğv et</button></div>{decisionError && <QueryError message={decisionError} />}</section>}
        <div className="commerce-grid" style={{ marginTop: 16 }}>
          <div>
            <section className="commerce-card commerce-card-pad"><div className="commerce-card-heading"><div><h2>Sifariş mərhələləri</h2><p>Son yeniliklər mağazaların təsdiqləmələrinə əsasən yenilənir.</p></div><Package size={19} color="#5b719a" /></div><div className="timeline">{order.data.timeline.map((event, index) => <div className="timeline-row" key={`${event.createdAt}-${index}`} data-testid={`timeline-event-${index}`}><div><strong>{event.label}</strong></div><time>{dateLabel(event.createdAt)}</time></div>)}</div></section>
            <section className="commerce-card commerce-card-pad"><div className="commerce-card-heading"><div><h2>Mağaza sifarişləri</h2><p>Sifarişinizdəki mağazalar və məhsullar.</p></div><Store size={19} color="#5b719a" /></div><div className="seller-summary">{order.data.sellerOrders.map((seller) => <article key={seller.id} className="seller-order-card commerce-card" data-testid={`card-buyer-seller-order-${seller.id}`}><div className="seller-order-top"><div><strong>{seller.sellerName}</strong><small>{seller.items.length} məhsul</small></div><StatePill status={seller.status} label={sellerStatusLabel(seller.status)} /></div><div className="order-items">{seller.items.map((item) => <div className="order-item-row" key={item.productId}><span><strong>{item.productName}</strong> · {item.quantity} ədəd</span><span>{money(item.lineTotalAzN)}</span></div>)}</div>{seller.trackingCode && <span className="tracking-badge">İzləmə kodu: {seller.trackingCode}</span>}</article>)}</div></section>
          </div>
          <aside>
            <section className="commerce-card commerce-card-pad"><div className="commerce-card-heading"><div><h2>Məlumatlar</h2><p>{accessToken ? 'Qonaq sifarişi' : 'Hesab sifarişi'}</p></div><ShieldCheck size={19} color="#5b719a" /></div><dl className="sidebar-summary" style={{ padding: '18px 0 0' }}><div><dt>Müştəri</dt><dd>{order.data.customerName}</dd></div><div><dt>Telefon</dt><dd>{order.data.customerPhone}</dd></div><div><dt>Ərazi</dt><dd>{order.data.deliveryArea}</dd></div><div><dt>Ünvan</dt><dd style={{ textAlign: 'right', maxWidth: 170 }}>{order.data.deliveryAddress}</dd></div><div><dt>Ödəniş</dt><dd>{paymentStatusLabel(order.data.paymentStatus)}</dd></div></dl></section>
            <section className="commerce-card commerce-card-pad" style={{ marginTop: 16 }}><div className="commerce-card-heading"><div><h2>Yekun məbləğ</h2><p>Mağazalar təsdiq etdikcə dəqiqləşir.</p></div></div><div className="summary-lines"><div className="summary-line"><span>Məhsullar</span><strong>{money(order.data.productSubtotalAzN)}</strong></div><div className="summary-line"><span>Çatdırılma</span><strong>{money(order.data.deliveryTotalAzN)}</strong></div><div className="summary-line total"><span>Cəmi</span><strong>{money(order.data.totalAzN)}</strong></div></div></section>
          </aside>
        </div>
      </>
    )}
  </div></main>;
}