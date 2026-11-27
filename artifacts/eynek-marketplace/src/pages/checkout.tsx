import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileUp,
  Info,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  CheckoutOptionsCardPaymentStatus,
  FulfillmentMethod,
  GuestOrderInputDeliveryArea,
  PaymentMethod,
  useCreateGuestOrder,
  useGetCheckoutOptions,
} from '@workspace/api-client-react';
import type { CheckoutOptions, GuestOrderInput } from '@workspace/api-client-react';
import { AddressMapPicker, type AddressMapValue } from '@/components/AddressMapPicker';
import { BrandLogo } from '@/components/brand-logo';
import { az } from '@/i18n/az';
import { FREE_DELIVERY_FROM_AZN, STANDARD_DELIVERY_FEE_AZN, deliveryFeeAzN } from '@/lib/delivery-pricing';
import { buildDeliverySlots, slotTag, type DeliveryWindow } from '@/lib/delivery-slots';
import { checkoutShouldPayImmediately, redirectToEpointCheckout } from '@/lib/epoint-pay';
import { clearPaymentFailedQuery, isPaymentFailedReturn, lastPlacedOrderHref, saveLastPlacedOrder } from '@/lib/last-placed-order';
import {
  cartNeedsPrescriptionSection,
  prescriptionFileUrl,
  prescriptionTag,
} from '@/lib/prescription';
import { LoadingCard, money } from './order-ui';
import './order-pages.css';

async function uploadPrescription(file: File): Promise<string> {
  const type = file.type === 'application/pdf'
    ? 'application/pdf'
    : file.type === 'image/png'
      ? 'image/png'
      : 'image/jpeg';
  const response = await fetch('/api/storage/uploads/prescription', {
    method: 'POST',
    headers: { 'Content-Type': type },
    body: file,
    credentials: 'include',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Resept yüklənmədi.');
  }
  const payload = (await response.json()) as { objectPath?: string };
  if (!payload.objectPath) throw new Error('Resept yüklənmədi.');
  return payload.objectPath;
}

export interface CheckoutCartItem {
  productId: string | number;
  productName?: string;
  name?: string;
  sellerName?: string;
  sellerLocation?: string;
  /** `Optik çərçivə` | `Gün eynəyi` — resept yalnız optikdə. */
  category?: string;
  quantity: number;
  unitPriceAzN?: number;
  lineTotalAzN?: number;
}

export interface CheckoutStore {
  name: string;
  location: string;
}

export interface CheckoutPageProps {
  items: CheckoutCartItem[];
  stores?: CheckoutStore[];
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

/** API (/checkout/options) işləməyəndə checkout UI bloklanmasın (lokal dev). */
const FALLBACK_CHECKOUT_OPTIONS: CheckoutOptions = {
  paymentMethods: [PaymentMethod.pay_on_delivery, PaymentMethod.card],
  cardPaymentStatus: CheckoutOptionsCardPaymentStatus.available,
  deliveryAreas: [GuestOrderInputDeliveryArea.Bakı, GuestOrderInputDeliveryArea.Abşeron],
  fulfillmentMethods: [FulfillmentMethod.courier, FulfillmentMethod.store_pickup],
};

export default function CheckoutPage({ items, stores = [], onClearCart }: CheckoutPageProps) {
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
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(FulfillmentMethod.courier);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.card);
  const [formError, setFormError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<{ id: string; orderNumber: string; token: string } | null>(null);
  const [payNote, setPayNote] = useState('');
  const [paymentRedirecting, setPaymentRedirecting] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState<AddressMapValue | null>(null);
  const deliverySlots = useMemo(() => buildDeliverySlots({ weekdayCount: 4 }), []);
  const [deliverySlotId, setDeliverySlotId] = useState(() => deliverySlots[0]?.id ?? '');
  const [prescriptionPath, setPrescriptionPath] = useState('');
  const [prescriptionName, setPrescriptionName] = useState('');
  const [prescriptionUploading, setPrescriptionUploading] = useState(false);
  const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const [paymentFailedReturn] = useState(() => typeof window !== 'undefined' && isPaymentFailedReturn());
  const lastOrderHref = useMemo(() => (typeof window !== 'undefined' ? lastPlacedOrderHref() : null), [paymentFailedReturn]);
  const selectedSlot = useMemo(
    () => deliverySlots.find((slot) => slot.id === deliverySlotId) ?? deliverySlots[0] ?? null,
    [deliverySlotId, deliverySlots],
  );
  const showPrescription = useMemo(
    () => cartNeedsPrescriptionSection(items.map((item) => item.category)),
    [items],
  );
  const prescriptionDeferredPay = Boolean(showPrescription && prescriptionPath);

  useEffect(() => {
    if (paymentFailedReturn) clearPaymentFailedQuery();
  }, [paymentFailedReturn]);

  useEffect(() => {
    if (!deliverySlots.some((slot) => slot.id === deliverySlotId) && deliverySlots[0]) {
      setDeliverySlotId(deliverySlots[0].id);
    }
  }, [deliverySlotId, deliverySlots]);

  const options = (checkoutOptions.data ?? FALLBACK_CHECKOUT_OPTIONS) as CheckoutOptions;
  const areas = options.deliveryAreas;
  const checkoutOffline = checkoutOptions.isError && !checkoutOptions.data;
  const pickup = fulfillmentMethod === FulfillmentMethod.store_pickup;
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.lineTotalAzN ?? (item.unitPriceAzN ?? 0) * item.quantity), 0), [items]);
  const deliveryFee = useMemo(
    () =>
      deliveryFeeAzN({
        fulfillmentMethod,
        productSubtotalAzN: subtotal,
      }),
    [fulfillmentMethod, subtotal],
  );
  const orderTotal = subtotal + deliveryFee;
  const pickupShops = useMemo(() => {
    const unique = new Map<string, { name: string; location: string }>();
    for (const item of items) {
      const name = item.sellerName?.trim();
      if (!name || unique.has(name)) continue;
      const store = stores.find((candidate) => candidate.name === name);
      unique.set(name, { name, location: store?.location || item.sellerLocation || 'Ünvan mağaza vitrinində' });
    }
    return [...unique.values()];
  }, [items, stores]);

  useEffect(() => {
    if (!areas.includes(form.deliveryArea)) setForm((current) => ({ ...current, deliveryArea: areas[0] ?? GuestOrderInputDeliveryArea.Bakı }));
  }, [areas, form.deliveryArea]);

  useEffect(() => {
    if ((!pickup || prescriptionDeferredPay) && paymentMethod !== PaymentMethod.card) {
      setPaymentMethod(PaymentMethod.card);
    }
  }, [pickup, paymentMethod, prescriptionDeferredPay]);

  const update = (key: keyof typeof defaultValues, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const setFulfillment = (method: FulfillmentMethod) => {
    setFulfillmentMethod(method);
    if (method === FulfillmentMethod.courier || prescriptionDeferredPay) setPaymentMethod(PaymentMethod.card);
  };

  const onPrescriptionFile = async (file: File | null) => {
    if (!file) return;
    const okType = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)
      || /\.(jpe?g|png|pdf)$/i.test(file.name);
    if (!okType) {
      setFormError('Resept üçün JPG, PNG və ya PDF seçin.');
      return;
    }
    setFormError('');
    setPrescriptionUploading(true);
    try {
      const path = await uploadPrescription(file);
      setPrescriptionPath(path);
      setPrescriptionName(file.name);
      setPaymentMethod(PaymentMethod.card);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Resept yüklənmədi.');
    } finally {
      setPrescriptionUploading(false);
      if (prescriptionInputRef.current) prescriptionInputRef.current.value = '';
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!items.length) {
      setFormError('Səbətinizdə sifariş üçün məhsul yoxdur.');
      return;
    }
    if (!pickup && form.deliveryAddress.trim().length < 5) {
      setFormError('Kuryer üçün ətraflı ünvan yazın.');
      return;
    }
    if (!pickup && !deliveryPin) {
      setFormError('Çatdırılma üçün xəritədə nöqtə seçin.');
      return;
    }
    if (!pickup && !selectedSlot) {
      setFormError('Çatdırılma tarixi və vaxtını seçin.');
      return;
    }
    const resolvedPayment = prescriptionDeferredPay || !pickup ? PaymentMethod.card : paymentMethod;
    if ((!pickup || prescriptionDeferredPay) && resolvedPayment !== PaymentMethod.card) {
      setFormError(prescriptionDeferredPay
        ? 'Reseptli sifarişdə ödəniş satıcı təsdiqindən sonra online edilir.'
        : 'Kuryer çatdırılmasında yalnız online ödəniş mümkündür.');
      return;
    }
    const guestAccessToken = createGuestToken();
    const input: GuestOrderInput = {
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone,
      fulfillmentMethod,
      paymentMethod: resolvedPayment,
      guestAccessToken,
      items: items.map((item) => ({ productId: String(item.productId), quantity: item.quantity })),
      ...(() => {
        const note = form.deliveryNote.trim();
        const rx = prescriptionPath
          ? [`Resept: yüklənib (${prescriptionName || 'fayl'})`, prescriptionTag(prescriptionPath)]
          : [];
        if (pickup) {
          const merged = [note, ...rx].filter(Boolean).join('\n');
          return merged ? { deliveryNote: merged } : {};
        }
        const geo = deliveryPin ? `[geo:${deliveryPin.lat.toFixed(6)},${deliveryPin.lng.toFixed(6)}]` : '';
        const slot = selectedSlot ? slotTag(selectedSlot) : '';
        const humanSlot = selectedSlot
          ? `Çatdırılma: ${selectedSlot.dateLabel}, ${selectedSlot.timeLabel}`
          : '';
        const merged = [note, humanSlot, slot, ...rx, geo].filter(Boolean).join('\n');
        return merged ? { deliveryNote: merged } : {};
      })(),
      ...(pickup
        ? {}
        : {
            deliveryArea: form.deliveryArea as GuestOrderInputDeliveryArea,
            deliveryAddress: form.deliveryAddress.trim(),
          }),
    };
    try {
      const order = await createOrder.mutateAsync({ data: input });
      sessionStorage.setItem(`eynek:order-token:${order.id}`, guestAccessToken);
      saveLastPlacedOrder({ id: order.id, orderNumber: order.orderNumber, token: guestAccessToken });
      onClearCart();

      const payNow = checkoutShouldPayImmediately({
        pickup,
        paymentMethod: resolvedPayment,
        prescriptionDeferredPay,
      });
      if (payNow) {
        setPaymentRedirecting(true);
        const payError = await redirectToEpointCheckout(order.id, guestAccessToken);
        if (!payError) return;
        setPaymentRedirecting(false);
        setPayNote('Sifariş qəbul edildi, amma ödəniş səhifəsi açılmadı. İzləmə səhifəsindən yenidən cəhd edin.');
        setPlacedOrder({ id: order.id, orderNumber: order.orderNumber, token: guestAccessToken });
        return;
      }

      setPayNote(
        prescriptionDeferredPay
          ? 'Resept mağazaya göndərildi. Ödəniş düyməsi mağaza məhsulu/resepti təsdiqləyəndən sonra izləmə səhifəsində açılacaq.'
          : pickup
            ? resolvedPayment === PaymentMethod.pay_on_delivery
              ? 'Sifariş qeydə alındı. Məhsulu mağazadan götürəndə nağd ödəyəcəksiniz.'
              : 'Sifariş qeydə alındı. Mağazadan götürəndə ödənişi orada edə bilərsiniz.'
            : '',
      );
      setPlacedOrder({ id: order.id, orderNumber: order.orderNumber, token: guestAccessToken });
    } catch (error) {
      const response = error as { data?: { error?: string } };
      setFormError(response.data?.error ?? 'Sifariş yaradılmadı. Məlumatları yoxlayıb yenidən cəhd edin.');
    }
  };

  const placeOrderLabel = createOrder.isPending
    ? 'Sifariş yaradılır...'
    : paymentRedirecting
      ? 'Ödənişə keçid...'
      : 'Sifariş ver';

  if (placedOrder) {
    return (
      <main className="commerce-page commerce-page--checkout">
        <div className="checkout-wrap">
          <section className="commerce-card commerce-card-pad order-complete">
            <CheckCircle2 size={28} color="#1f8a4c" />
            <div className="eyebrow">Sifariş qəbul edildi</div>
            <h1>Sifarişin tamamlandı.</h1>
            <p>
              {payNote
                || `Sifariş ${placedOrder.orderNumber} qeydə alındı. İzləmə səhifəsindən vəziyyəti izləyə bilərsiniz.`}
            </p>
            <button className="btn btn-blue" type="button" data-testid="link-track-order" onClick={() => setLocation(`/order/${placedOrder.id}#${placedOrder.token}`)}>Sifarişi izlə <ArrowRight size={16} /></button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="commerce-page commerce-page--checkout">
      <div className="checkout-wrap">
        <Link href="/cart" className="checkout-back text-link" data-testid="link-checkout-back">
          ← Səbətə qayıt
        </Link>
        <header className="commerce-header commerce-header--checkout">
          <div className="checkout-header-main">
            <Link href="/" className="brand" data-testid="link-checkout-brand"><BrandLogo /></Link>
            <div className="eyebrow checkout-eyebrow">Sifarişin tamamlanması</div>
            <h1 className="checkout-title">Sifarişini rahat tamamla.</h1>
          </div>
          <p className="checkout-lead">Kuryer ilə Bakı və Abşerona çatdırılır; mağazadan götürmə pulsuzdur.</p>
        </header>

        {paymentFailedReturn ? (
          <div className="commerce-error" role="alert" style={{ marginBottom: 16 }} data-testid="banner-payment-failed">
            <AlertCircle size={18} />
            <span>
              Kart ödənişi tamamlanmadı və ya ləğv olundu.
              {lastOrderHref ? (
                <>
                  {' '}
                  <Link href={lastOrderHref} className="text-link">
                    Sifarişi izlə
                  </Link>{' '}
                  səhifəsindən yenidən ödəniş edə bilərsiniz.
                </>
              ) : (
                ' E-poçtdakı sifariş linkindən yenidən cəhd edin.'
              )}
            </span>
          </div>
        ) : null}

        {paymentRedirecting ? (
          <LoadingCard lines={4} />
        ) : checkoutOptions.isLoading ? (
          <LoadingCard lines={5} />
        ) : (
          <form id="eynek-checkout-form" className="commerce-grid commerce-grid--checkout" onSubmit={submit}>
            {checkoutOffline ? (
              <div className="info-ribbon" style={{ gridColumn: '1 / -1' }}>
                <Info size={16} />
                <span>
                  API işləmir — forma yalnız xəritəni yoxlamaq üçündür. Sifariş göndərmək üçün terminalda{' '}
                  <strong>pnpm dev:api</strong> və `.env`-də <strong>DATABASE_URL</strong> lazımdır.{' '}
                  <button type="button" className="text-link" onClick={() => void checkoutOptions.refetch()}>
                    Yenidən cəhd et
                  </button>
                </span>
              </div>
            ) : null}
            <div className="checkout-main">
              <section className="commerce-card commerce-card-pad">
                <div className="commerce-card-heading"><div><h2>Əlaqə məlumatları</h2><p>Mağaza və ya EYNƏK sifarişlə bağlı bu məlumatlarla sizinlə əlaqə saxlayacaq.</p></div><ShieldCheck size={19} color="#5b719a" /></div>
                <div className="commerce-form">
                  <div className="commerce-field"><label htmlFor="customerName">Ad və soyad</label><input id="customerName" data-testid="input-customer-name" required minLength={2} value={form.customerName} onChange={(event) => update('customerName', event.target.value)} /></div>
                  <div className="commerce-field"><label htmlFor="customerPhone">Telefon</label><input id="customerPhone" data-testid="input-customer-phone" required minLength={7} type="tel" placeholder="+994 50 000 00 00" value={form.customerPhone} onChange={(event) => update('customerPhone', event.target.value)} /></div>
                  <div className="commerce-field full"><label htmlFor="customerEmail">E-poçt</label><input id="customerEmail" data-testid="input-customer-email" required type="email" value={form.customerEmail} onChange={(event) => update('customerEmail', event.target.value)} /></div>
                </div>
              </section>

              <section className="commerce-card commerce-card-pad">
                <div className="commerce-card-heading"><div><h2>Çatdırılma üsulu</h2><p>Kuryer haqqı sifarişdən sonra dəqiqləşir. Mağazadan götürmə pulsuzdur.</p></div><Truck size={19} color="#5b719a" /></div>
                <div style={{ paddingTop: 17 }}>
                  <label className={`payment-choice ${!pickup ? 'selected' : ''}`} data-testid="choice-fulfillment-courier">
                    <input type="radio" name="fulfillmentMethod" checked={!pickup} onChange={() => setFulfillment(FulfillmentMethod.courier)} />
                    <span>
                      <strong>Kuryer ilə çatdırılma</strong>
                      <span>
                        Bakı və Abşeron · {STANDARD_DELIVERY_FEE_AZN} AZN
                        {` · ${FREE_DELIVERY_FROM_AZN} AZN-dən pulsuz`} · yalnız online ödəniş
                      </span>
                    </span>
                    <Truck size={17} color="#5b719a" />
                  </label>
                  <label className={`payment-choice ${pickup ? 'selected' : ''}`} data-testid="choice-fulfillment-pickup">
                    <input type="radio" name="fulfillmentMethod" checked={pickup} onChange={() => setFulfillment(FulfillmentMethod.store_pickup)} />
                    <span><strong>Mağazadan pulsuz götürmə</strong><span>Məhsulu satan optikadan özünüz götürün. Nağd və ya online ödəyə bilərsiniz.</span></span>
                    <Store size={17} color="#5b719a" />
                  </label>
                </div>
              </section>

              {pickup ? (
                <section className="commerce-card commerce-card-pad">
                  <div className="commerce-card-heading"><div><h2>Götürmə məntəqələri</h2><p>Bir neçə mağazadan alsanız, hər birindən ayrıca götürməlisiniz.</p></div><Store size={19} color="#5b719a" /></div>
                  <div className="pickup-shops" data-testid="list-pickup-shops">
                    {(pickupShops.length ? pickupShops : [{ name: 'Seçilmiş mağazalar', location: 'Sifariş təsdiqlənəndə ünvan göstəriləcək' }]).map((shop) => (
                      <div className="pickup-shop" key={shop.name}>
                        <strong>{shop.name}</strong>
                        <span>{shop.location}</span>
                      </div>
                    ))}
                  </div>
                  <div className="commerce-form" style={{ paddingTop: 8 }}>
                    <div className="commerce-field full"><label htmlFor="pickupNote">Götürmə qeydi <span style={{ color: '#87909c', fontWeight: 500 }}>(istəyə görə)</span></label><textarea id="pickupNote" data-testid="input-delivery-note" placeholder="Məsələn, axşam 18:00-dan sonra gələcəyəm" value={form.deliveryNote} onChange={(event) => update('deliveryNote', event.target.value)} /></div>
                  </div>
                </section>
              ) : (
                <section className="commerce-card commerce-card-pad">
                  <div className="commerce-card-heading"><div><h2>Çatdırılma ünvanı</h2><p>Hazırda yalnız Bakı və Abşeron üçün çatdırırıq.</p></div><MapPin size={19} color="#5b719a" /></div>
                  <div className="commerce-form">
                    <div className="commerce-field"><label htmlFor="deliveryArea">Ərazi</label><select id="deliveryArea" data-testid="select-delivery-area" value={form.deliveryArea} onChange={(event) => update('deliveryArea', event.target.value)}>{areas.map((area) => <option value={area} key={area}>{area}</option>)}</select></div>
                    <div className="commerce-field full">
                      <AddressMapPicker
                        value={deliveryPin}
                        onChange={setDeliveryPin}
                        onSuggestAddress={(line) => {
                          setForm((current) => ({ ...current, deliveryAddress: line }));
                        }}
                      />
                    </div>
                    <div className="commerce-field full"><label htmlFor="deliveryAddress">Ətraflı ünvan</label><textarea id="deliveryAddress" data-testid="input-delivery-address" required={!pickup} minLength={5} placeholder="Küçə, bina, mənzil və ya ofis" value={form.deliveryAddress} onChange={(event) => update('deliveryAddress', event.target.value)} /></div>
                    <div className="commerce-field full"><label htmlFor="deliveryNote">Çatdırılma qeydi <span style={{ color: '#87909c', fontWeight: 500 }}>(istəyə görə)</span></label><textarea id="deliveryNote" data-testid="input-delivery-note" placeholder="Kuryer üçün əlavə məlumat" value={form.deliveryNote} onChange={(event) => update('deliveryNote', event.target.value)} /></div>
                  </div>
                </section>
              )}

              {!pickup ? (
                <section className="commerce-card commerce-card-pad" data-testid="section-delivery-slots">
                  <div className="commerce-card-heading">
                    <div>
                      <h2>Çatdırılma tarixi və vaxtı</h2>
                    </div>
                    <CalendarDays size={19} color="#5b719a" />
                  </div>
                  <div className="delivery-slot-row" role="listbox" aria-label="Çatdırılma tarixi və vaxtı">
                    {deliverySlots.map((slot: DeliveryWindow) => {
                      const selected = slot.id === (selectedSlot?.id ?? '');
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`delivery-slot-card${selected ? ' is-selected' : ''}`}
                          onClick={() => setDeliverySlotId(slot.id)}
                          data-testid={`button-delivery-slot-${slot.id}`}
                        >
                          <span className="delivery-slot-time">{slot.timeLabel}</span>
                          <strong className="delivery-slot-date">{slot.dateLabel}</strong>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {showPrescription ? (
                <section className="commerce-card commerce-card-pad" data-testid="section-prescription">
                  <div className="commerce-card-heading">
                    <div>
                      <h2>Optik resept</h2>
                      <p>Yalnız optik çərçivə üçün. Gün eynəyində lazım deyil. PDF və ya şəkil (istəyə görə).</p>
                    </div>
                    <FileUp size={19} color="#5b719a" />
                  </div>
                  <input
                    ref={prescriptionInputRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                    hidden
                    onChange={(event) => void onPrescriptionFile(event.target.files?.[0] ?? null)}
                    data-testid="input-prescription-file"
                  />
                  {prescriptionPath ? (
                    <div className="prescription-file" data-testid="status-prescription-ready">
                      <div>
                        <strong>{prescriptionName || 'Resept yükləndi'}</strong>
                        <span>Ödəniş mağaza təsdiqindən sonra açılacaq.</span>
                        <a href={prescriptionFileUrl(prescriptionPath)} target="_blank" rel="noreferrer">Fayla bax</a>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setPrescriptionPath('');
                          setPrescriptionName('');
                        }}
                        data-testid="button-prescription-remove"
                      >
                        <X size={15} /> Sil
                      </button>
                    </div>
                  ) : (
                    <div className="prescription-upload">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={prescriptionUploading}
                        onClick={() => prescriptionInputRef.current?.click()}
                        data-testid="button-prescription-upload"
                      >
                        <FileUp size={14} /> {prescriptionUploading ? 'Yüklənir...' : 'Resept yüklə (PDF/şəkil)'}
                      </button>
                      <p className="commerce-note" style={{ margin: '10px 0 0' }}>
                        Resept yükləsəniz, indi ödəniş olunmur — mağaza təsdiqləyəndən sonra «Ödəniş et» açılır.
                      </p>
                    </div>
                  )}
                </section>
              ) : null}

              <section className="commerce-card commerce-card-pad">
                <div className="commerce-card-heading">
                  <div>
                    <h2>Ödəniş üsulu</h2>
                    <p>
                      {prescriptionDeferredPay
                        ? 'Reseptli sifariş: ödəniş mağaza təsdiqindən sonra online açılır.'
                        : pickup
                          ? az.payment.checkoutIntroPickup
                          : az.payment.checkoutIntroCourier}
                    </p>
                  </div>
                  <CreditCard size={19} color="#5b719a" />
                </div>
                <div style={{ paddingTop: 17 }}>
                  {pickup && !prescriptionDeferredPay ? (
                    <label className={`payment-choice ${paymentMethod === PaymentMethod.pay_on_delivery ? 'selected' : ''}`} data-testid="choice-payment-cash">
                      <input type="radio" name="paymentMethod" checked={paymentMethod === PaymentMethod.pay_on_delivery} onChange={() => setPaymentMethod(PaymentMethod.pay_on_delivery)} />
                      <span>
                        <strong>Götürəndə nağd ödəniş</strong>
                        <span>Məhsulu mağazadan götürəndə nağd ödəyin.</span>
                      </span>
                      <Banknote size={17} color="#5b719a" />
                    </label>
                  ) : null}
                  <label className={`payment-choice ${paymentMethod === PaymentMethod.card ? 'selected' : ''}`} data-testid="choice-payment-card">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === PaymentMethod.card}
                      onChange={() => setPaymentMethod(PaymentMethod.card)}
                    />
                    <span>
                      <strong>Bank kartı ilə online ödəniş</strong>
                      <span>
                        {prescriptionDeferredPay
                          ? 'İndi ödəniş yoxdur. Mağaza təsdiqindən sonra izləmə səhifəsində «Ödəniş et» açılacaq.'
                          : pickup
                            ? 'İstəsəniz online ödəyib mağazadan götürün.'
                            : 'Kuryer çatdırılmasında yalnız online ödəniş mümkündür.'}
                      </span>
                    </span>
                    <CreditCard size={17} color="#5b719a" />
                  </label>
                </div>
              </section>
            </div>

            <aside className="checkout-aside">
              <section className="commerce-card commerce-card-pad checkout-summary-card">
                <div className="commerce-card-heading"><div><h2>Sifariş xülasəsi</h2><p>{items.length} məhsul · {pickup ? 'mağazadan götürmə' : 'kuryer çatdırılması'}</p></div><PackageCheck size={19} color="#5b719a" /></div>
                {items.length > 0 ? (
                  <div className="checkout-items">
                    {items.map((item, index) => (
                      <div className="checkout-item" key={`${item.productId}-${index}`} data-testid={`row-checkout-item-${item.productId}`}>
                        <div>
                          <strong>{item.productName ?? item.name ?? `Məhsul ${item.productId}`}</strong>
                          <small>{item.sellerName ? `${item.sellerName} · ` : ''}Say: {item.quantity}</small>
                        </div>
                        <span className="checkout-item-price">{money(item.lineTotalAzN ?? (item.unitPriceAzN ?? 0) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className={`summary-lines${items.length ? '' : ' summary-lines--compact'}`}>
                  <div className="summary-line"><span>Məhsullar</span><strong>{money(subtotal)}</strong></div>
                  <div className="summary-line">
                    <span>Çatdırılma</span>
                    <strong data-testid="text-checkout-delivery-fee">
                      {pickup ? money(0) : deliveryFee <= 0 ? 'Pulsuz' : money(deliveryFee)}
                    </strong>
                  </div>
                  {!pickup && deliveryFee <= 0 && subtotal >= FREE_DELIVERY_FROM_AZN ? (
                    <p className="commerce-note" style={{ margin: 0 }} data-testid="text-free-delivery-hint">
                      {FREE_DELIVERY_FROM_AZN} AZN və daha çoxu üçün çatdırılma pulsuzdur.
                    </p>
                  ) : null}
                  <div className="summary-line total"><span>Cəmi</span><strong data-testid="text-checkout-total">{money(orderTotal)}</strong></div>
                </div>
                <div className="commerce-submit checkout-submit--desktop">
                  <button className="btn btn-blue" type="submit" disabled={createOrder.isPending || paymentRedirecting || !items.length} data-testid="button-place-order">{placeOrderLabel} <ArrowRight size={15} /></button>
                  <p className="commerce-note">Sifarişi təsdiqləməklə <Link href="/qaydalar">istifadə şərtləri</Link> və <Link href="/mexfilik">məxfilik</Link> qaydaları ilə razılaşırsınız.</p>
                </div>
                {formError ? <div className="commerce-error checkout-error--aside" role="alert" data-testid="status-checkout-error"><AlertCircle size={16} /><span>{formError}</span></div> : null}
              </section>
              {pickup ? (
                <div className="info-ribbon" style={{ marginTop: 14 }}>
                  <Store size={15} />
                  <span>Mağaza sifarişi təsdiqləyəndən sonra götürməyə hazır olduğunu izləmə səhifəsində görəcəksiniz.</span>
                </div>
              ) : null}
              {createOrder.isSuccess && <div className="info-ribbon" style={{ marginTop: 14 }}><Info size={16} /><span>Sifarişiniz yaradıldı. İzləmə səhifəsinə yönləndirilirsiniz.</span></div>}
            </aside>
          </form>
        )}
        {!placedOrder && !paymentRedirecting && !checkoutOptions.isLoading ? (
          <div className="checkout-mobile-bar" data-testid="checkout-mobile-bar">
            {formError ? (
              <div className="commerce-error checkout-mobile-error" role="alert">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            ) : null}
            <div className="checkout-mobile-bar-row">
              <div className="checkout-mobile-total">
                <span>Cəmi</span>
                <strong data-testid="text-checkout-mobile-total">{money(orderTotal)}</strong>
              </div>
              <button
                className="btn btn-blue checkout-mobile-submit"
                type="submit"
                form="eynek-checkout-form"
                disabled={createOrder.isPending || paymentRedirecting || !items.length}
                data-testid="button-place-order-mobile"
              >
                {placeOrderLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
