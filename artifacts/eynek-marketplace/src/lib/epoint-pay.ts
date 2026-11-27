/** Qonaq sifariş üçün Epoint ödəniş səhifəsinə POST redirect. */
export async function redirectToEpointCheckout(orderId: string, guestAccessToken?: string): Promise<string | null> {
  const headers: Record<string, string> = {};
  if (guestAccessToken?.trim()) {
    headers['X-Order-Access-Token'] = guestAccessToken.trim();
  }
  const pay = await fetch(`/api/orders/${orderId}/epoint`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });
  const session = (await pay.json().catch(() => ({}))) as {
    error?: string;
    data?: string;
    signature?: string;
    checkoutUrl?: string;
  };
  if (!pay.ok || !session.data || !session.signature || !session.checkoutUrl) {
    return session.error || 'Ödəniş səhifəsi açılmadı.';
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = session.checkoutUrl;
  form.acceptCharset = 'utf-8';
  for (const [name, value] of [
    ['data', session.data],
    ['signature', session.signature],
  ] as const) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  return null;
}

export function checkoutShouldPayImmediately(input: {
  pickup: boolean;
  paymentMethod: string;
  prescriptionDeferredPay: boolean;
}) {
  return !input.pickup && input.paymentMethod === 'card' && !input.prescriptionDeferredPay;
}