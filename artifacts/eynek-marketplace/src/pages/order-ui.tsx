import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import type { AdminOrder, BuyerOrder, OrderStatus, PaymentStatus, SellerOrderStatus } from '@workspace/api-client-react';

export function money(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `${value.toFixed(2)} AZN`;
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('az-AZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const orderLabels: Record<OrderStatus, string> = {
  received: 'Qəbul edildi',
  pending_confirmation: 'Təsdiq gözləyir',
  awaiting_buyer_approval: 'Sizin təsdiqiniz gözlənilir',
  confirmed: 'Təsdiqləndi',
  preparing: 'Hazırlanır',
  out_for_delivery: 'Çatdırılır',
  partially_delivered: 'Qismən çatdırılıb',
  delivered: 'Çatdırıldı',
  cancelled: 'Ləğv edildi',
};

const sellerLabels: Record<SellerOrderStatus, string> = {
  pending_confirmation: 'Təsdiq gözləyir',
  confirmed: 'Təsdiqləndi',
  declined: 'Qəbul edilmədi',
  paused: 'Dayandırılıb',
  preparing: 'Hazırlanır',
  out_for_delivery: 'Çatdırılır',
  delivered: 'Çatdırıldı',
  cancelled: 'Ləğv edildi',
};

const paymentLabels: Record<PaymentStatus, string> = {
  due_on_delivery: 'Çatdırılmada ödəniş',
  authorized: 'Avtorizasiya edildi',
  captured: 'Ödəniş alındı',
  paid_on_delivery: 'Çatdırılmada ödənildi',
  failed: 'Ödəniş alınmadı',
  partially_refunded: 'Qismən geri qaytarılıb',
  refunded: 'Geri qaytarılıb',
};

export function orderStatusLabel(status: OrderStatus) {
  return orderLabels[status] ?? status;
}

export function sellerStatusLabel(status: SellerOrderStatus) {
  return sellerLabels[status] ?? status;
}

export function paymentStatusLabel(status: PaymentStatus) {
  return paymentLabels[status] ?? status;
}

export function statusTone(status: string) {
  if (['delivered', 'paid_on_delivery', 'confirmed'].includes(status)) return 'is-green';
  if (['cancelled', 'declined', 'failed', 'refunded'].includes(status)) return 'is-red';
  if (['awaiting_buyer_approval', 'pending_confirmation', 'preparing'].includes(status)) return 'is-warm';
  return 'is-blue';
}

export function StatePill({ status, label }: { status: string; label: string }) {
  return <span className={`state-pill ${statusTone(status)}`} data-testid={`status-${status}`}>{label}</span>;
}

export function QueryError({ message = 'Məlumat yüklənmədi.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="commerce-error" role="alert" data-testid="status-query-error">
      <AlertCircle size={16} />
      <span>{message} {onRetry && <button className="text-link" type="button" onClick={onRetry} data-testid="button-retry-query">Yenidən cəhd et</button>}</span>
    </div>
  );
}

export function LoadingCard({ lines = 4 }: { lines?: number }) {
  return <div className="commerce-card commerce-card-pad" aria-label="Yüklənir" data-testid="status-loading">{Array.from({ length: lines }).map((_, index) => <div className="commerce-skeleton" key={index} style={{ width: `${72 + (index % 3) * 9}%` }} />)}</div>;
}

export function StatusIcon({ status }: { status: string }) {
  if (['delivered', 'confirmed'].includes(status)) return <CheckCircle2 size={15} />;
  return <Clock3 size={15} />;
}

export type OrderRecord = BuyerOrder | AdminOrder;