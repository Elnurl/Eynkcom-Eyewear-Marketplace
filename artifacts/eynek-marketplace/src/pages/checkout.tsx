import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Info, MapPin, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  GuestOrderInputDeliveryArea,
  PaymentMethod,
  useCreateGuestOrder,
  useGetCheckoutOptions,
} from '@workspace/api-client-react';
import type { CheckoutOptions, GuestOrderInput } from '@workspace/api-client-react';
import { BrandLogo } from '@/components/brand-logo';
import { LoadingCard, QueryError, money } from './order-ui';
import './order-pages.css';

export interface CheckoutCartItem {
  productId: string | number;
  productName?: string;
  name?: string;
  sellerName?: string;
  quantity: number;
  unitPriceAzN?: number;
  lineTotalAzN?: number;
}

export interface CheckoutPageProps {
  items: CheckoutCartItem[];
  onClearCart: () => void;
}

function createGuestToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const defaultValues = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  deliveryArea: GuestOrderInputDeliveryArea.Bakı,
  deliveryAddress: '',
  deliveryNote: '',
};

export default function CheckoutPage({ items, onClearCart }: CheckoutPageProps) {
  const [, setLocation] = useLocation();
  const checkoutOptions = useGetCheckoutOptions();
  const createOrder = useCreateGuestOrder();
  const [form, setForm] = useState<{
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryArea: GuestOrderInputDeliveryArea;
    deliveryAddress: string;
    deliveryNote: string;
  }>(defaultValues);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.pay_on_delivery);
  const [formError, setFormError] = useState('');

  const options = checkoutOptions.data as CheckoutOptions | undefined;
  const areas = options?.deliveryAreas ?? [GuestOrderInputDeliveryArea.Bakı, GuestOrderInputDeliveryArea.Abşeron];
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.lineTotalAzN ?? (item.unitPriceAzN ?? 0) * item.quantity), 0), [items]);

  useEffect(() => {
    if (!areas.includes(form.deliveryArea)) setForm((current) => ({ ...current, deliveryArea: areas[0] ?? GuestOrderInputDeliveryArea.Bakı }));
  }, [areas, form.deliveryArea]);

  const update = (key: keyof typeof defaultValues, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!items.length) {
      setFormError('Səbətinizdə sifariş üçün məhsul yoxdur.');
      return;
    }
    const guestAccessToken = createGuestToken();
    const input: GuestOrderInput = {
      ...form,
      deliveryArea: form.deliveryArea as GuestOrderInputDeliveryArea,
      paymentMethod,
      guestAccessToken,
      items: items.map((item) => ({ productId: String(item.productId), quantity: item.quantity })),
      ...(form.deliveryNote.trim() ? { deliveryNote: form.deliveryNote.trim() } : {}),
    };
    try {
      const order = await createOrder.mutateAsync({ data: input });
      sessionStorage.setItem(`eynek:order-token:${order.id}`, guestAccessToken);
      onClearCart();
      setLocation(`/order/${order.id}#${guestAccessToken}`);
    } catch (error) {
      const response = error as { data?: { error?: string } };
      setFormError(response.data?.error ?? 'Sifariş yaradılmadı. Məlumatları yoxlayıb yenidən cəhd edin.');
    }
  };

  return (
    <main className="commerce-page">
      <div className="commerce-wrap">
        <header className="commerce-header">
          <div>
            <Link href="/" className="brand" data-testid="link-checkout-brand"><BrandLogo /></Link>
            <div className="eyebrow" style={{ marginTop: 25 }}>Sifarişin tamamlanması</div>
            <h1>Sifarişini<br />rahat tamamla.</h1>
          </div>
          <p>Bir sifarişdə bir neçə optik mağazadan məhsul seçə bilərsiniz. Çatdırılma Bakı və Abşeron əraziləri üçün mövcuddur.</p>
        </header>

        {checkoutOptions.isLoading ? <LoadingCard lines={5} /> : checkoutOptions.isError ? <QueryError message="Çatdırılma seçimləri yüklənmədi." onRetry={() => void checkoutOptions.refetch()} /> : (
          <form className="commerce-grid" onSubmit={submit}>
            <div>
              <section className="commerce-card commerce-card-pad">
                <div className="commerce-card-heading"><div><h2>Əlaqə məlumatları</h2><p>Mağaza və ya EYNƏK sifarişlə bağlı bu məlumatlarla sizinlə əlaqə saxlayacaq.</p></div><ShieldCheck size={19} color="#5b719a" /></div>
                <div className="commerce-form">
                  <div className="commerce-field"><label htmlFor="customerName">Ad və soyad</label><input id="customerName" data-testid="input-customer-name" required minLength={2} value={form.customerName} onChange={(event) => update('customerName', event.target.value)} /></div>
                  <div className="commerce-field"><label htmlFor="customerPhone">Telefon</label><input id="customerPhone" data-testid="input-customer-phone" required minLength={7} type="tel" placeholder="+994 50 000 00 00" value={form.customerPhone} onChange={(event) => update('customerPhone', event.target.value)} /></div>
                  <div className="commerce-field full"><label htmlFor="customerEmail">E-poçt</label><input id="customerEmail" data-testid="input-customer-email" required type="email" value={form.customerEmail} onChange={(event) => update('customerEmail', event.target.value)} /></div>
                </div>
              </section>

              <section className="commerce-card commerce-card-pad">
                <div className="commerce-card-heading"><div><h2>Çatdırılma ünvanı</h2><p>Hazırda yalnız Bakı və Abşeron üçün çatdırırıq.</p></div><MapPin size={19} color="#5b719a" /></div>
                <div className="commerce-form">
                  <div className="commerce-field"><label htmlFor="deliveryArea">Ərazi</label><select id="deliveryArea" data-testid="select-delivery-area" value={form.deliveryArea} onChange={(event) => update('deliveryArea', event.target.value)}>{areas.map((area) => <option value={area} key={area}>{area}</option>)}</select></div>
                  <div className="commerce-field full"><label htmlFor="deliveryAddress">Ətraflı ünvan</label><textarea id="deliveryAddress" data-testid="input-delivery-address" required minLength={5} placeholder="Küçə, bina, mənzil və ya ofis" value={form.deliveryAddress} onChange={(event) => update('deliveryAddress', event.target.value)} /></div>
                  <div className="commerce-field full"><label htmlFor="deliveryNote">Çatdırılma qeydi <span style={{ color: '#87909c', fontWeight: 500 }}>(istəyə görə)</span></label><textarea id="deliveryNote" data-testid="input-delivery-note" placeholder="Kuryer üçün əlavə məlumat" value={form.deliveryNote} onChange={(event) => update('deliveryNote', event.target.value)} /></div>
                </div>
              </section>

              <section className="commerce-card commerce-card-pad">
                <div className="commerce-card-heading"><div><h2>Ödəniş üsulu</h2><p>Ödənişi məhsullar çatdırılan zaman edin.</p></div><CreditCard size={19} color="#5b719a" /></div>
                <div style={{ paddingTop: 17 }}>
                  <label className={`payment-choice ${paymentMethod === PaymentMethod.pay_on_delivery ? 'selected' : ''}`}><input type="radio" name="paymentMethod" checked={paymentMethod === PaymentMethod.pay_on_delivery} onChange={() => setPaymentMethod(PaymentMethod.pay_on_delivery)} /><span><strong>Çatdırılmada nağd ödəniş</strong><span>Sifariş qapınıza çatanda ödəyin.</span></span><CheckCircle2 size={17} color="#2a7045" /></label>
                  <div className="payment-choice disabled" aria-disabled="true" data-testid="payment-card-unavailable"><CreditCard size={17} /><span><strong>Bank kartı</strong><span>Kartla ödəniş hələ aktiv deyil.</span></span><em>Konfiqurasiya olunmayıb</em></div>
                </div>
              </section>
            </div>

            <aside>
              <section className="commerce-card commerce-card-pad">
                <div className="commerce-card-heading"><div><h2>Sifariş xülasəsi</h2><p>{items.length} məhsul · bir neçə mağaza ola bilər</p></div><PackageCheck size={19} color="#5b719a" /></div>
                <div className="checkout-items">{items.map((item, index) => <div className="checkout-item" key={`${item.productId}-${index}`} data-testid={`row-checkout-item-${item.productId}`}><div><strong>{item.productName ?? item.name ?? `Məhsul ${item.productId}`}</strong><small>{item.sellerName ? `${item.sellerName} · ` : ''}Say: {item.quantity}</small></div><span className="checkout-item-price">{money(item.lineTotalAzN ?? (item.unitPriceAzN ?? 0) * item.quantity)}</span></div>)}</div>
                <div className="summary-lines"><div className="summary-line"><span>Məhsullar</span><strong>{money(subtotal)}</strong></div><div className="summary-line"><span>Çatdırılma</span><strong>Sifarişdən sonra</strong></div><div className="summary-line total"><span>Cəmi</span><strong>{money(subtotal)}</strong></div></div>
                <div className="commerce-submit"><button className="btn btn-blue" type="submit" disabled={createOrder.isPending || !items.length} data-testid="button-place-order">{createOrder.isPending ? 'Sifariş yaradılır...' : 'Sifarişi təsdiqlə'} <ArrowRight size={15} /></button><p className="commerce-note">Sifarişi təsdiqləməklə əlaqə və çatdırılma məlumatlarınızın işlənməsinə razılaşırsınız.</p></div>
                {formError && <div className="commerce-error" role="alert" data-testid="status-checkout-error"><AlertCircle size={16} /><span>{formError}</span></div>}
              </section>
              <div className="info-ribbon" style={{ marginTop: 14 }}><Truck size={16} /><span>Mağazalar sifarişi təsdiqlədikdən sonra yekun çatdırılma haqqı sifarişinizdə ayrıca göstəriləcək.</span></div>
              {createOrder.isSuccess && <div className="info-ribbon" style={{ marginTop: 14 }}><Info size={16} /><span>Sifarişiniz yaradıldı. İzləmə səhifəsinə yönləndirilirsiniz.</span></div>}
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}