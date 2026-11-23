export type LastPlacedOrder = {
  id: string;
  orderNumber: string;
  token: string;
};

export function saveLastPlacedOrder(order: LastPlacedOrder) {
  sessionStorage.setItem('eynek:last-placed-order', JSON.stringify(order));
}

export function readLastPlacedOrder(): LastPlacedOrder | null {
  try {
    const raw = sessionStorage.getItem('eynek:last-placed-order');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastPlacedOrder;
    if (parsed?.id && parsed?.token) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function lastPlacedOrderHref() {
  const order = readLastPlacedOrder();
  return order ? `/order/${order.id}#${order.token}` : null;
}

export function isPaymentFailedReturn() {
  return new URLSearchParams(window.location.search).get('payment') === 'failed';
}

export function clearPaymentFailedQuery() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('payment')) return;
  url.searchParams.delete('payment');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}