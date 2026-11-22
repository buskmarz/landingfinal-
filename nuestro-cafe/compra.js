const form = document.querySelector('[data-natural-checkout]');
const fields = form.querySelector('[data-order-fields]');
const status = form.querySelector('[data-coffee-checkout-status]');
const price = document.querySelector('[data-product-price]');
const total = form.querySelector('[data-coffee-total]');
const deliveryFields = form.querySelector('[data-delivery-fields]');
const deliveryFeeLabel = form.querySelector('[data-delivery-fee-label]');
const submit = form.querySelector('button[type="submit"]');
const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', currencyDisplay: 'code',
});
let product;
let deliveryFee = 0;
let busy = false;
let lastAttempt;
const draftKey = 'bm-natural-purchase';

function setStatus(message, tone = 'neutral') {
  status.textContent = message;
  status.dataset.tone = tone;
}

function updateTotal() {
  const delivery = form.elements.fulfillmentMethod.value === 'delivery';
  deliveryFields.hidden = !delivery;
  deliveryFeeLabel.hidden = !delivery;
  form.elements.deliveryStreet.required = delivery;
  form.elements.deliveryNeighborhood.required = delivery;
  if (product) total.textContent = currency.format(product.unitPrice * Number(form.elements.quantity.value) + (delivery ? deliveryFee : 0));
}

async function loadProduct() {
  product = undefined;
  fields.disabled = true;
  try {
    const response = await fetch('/api/coffee-product?product=natural');
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data.product?.unitPrice > 0 && data.product.weight) {
      price.textContent = currency.format(data.product.unitPrice) + ' · ' + data.product.weight;
    }
    if (!data.checkoutAvailable) {
      fields.hidden = true;
      setStatus('La compra en línea se abrirá cuando el café esté disponible.');
      return;
    }
    product = data.product;
    deliveryFee = data.shipping.deliveryFee;
    price.textContent = currency.format(product.unitPrice) + ' · ' + product.weight;
    deliveryFeeLabel.textContent = 'Envío incluido en el total · ' + currency.format(deliveryFee);
    fields.hidden = false;
    fields.disabled = false;
    setStatus('');
    updateTotal();
  } catch {
    fields.hidden = true;
    price.textContent = 'Precio por confirmar';
    setStatus('No pudimos consultar disponibilidad. Intenta de nuevo más tarde.', 'error');
  }
}

form.addEventListener('change', updateTotal);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!product || busy) return;
  busy = true;
  submit.disabled = true;
  setStatus('Preparando tu pago…');
  const payload = Object.fromEntries(new FormData(form));
  payload.product = 'natural';
  payload.expectedTotal = Number((product.unitPrice * Number(payload.quantity) + (payload.fulfillmentMethod === 'delivery' ? deliveryFee : 0)).toFixed(2));
  payload.acceptsTerms = form.elements.acceptsTerms.checked;

  let redirecting = false;
  try {
    const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
    const fingerprint = Array.from(new Uint8Array(bytes),byte => byte.toString(16).padStart(2,'0')).join('');
    try { lastAttempt = JSON.parse(sessionStorage.getItem(draftKey)); } catch (_) { /* Storage is optional. */ }
    if (lastAttempt?.fingerprint !== fingerprint) lastAttempt = {fingerprint,requestId:crypto.randomUUID()};
    try { sessionStorage.setItem(draftKey,JSON.stringify(lastAttempt)); } catch (_) { /* Storage is optional. */ }
    const response = await fetch('/api/coffee-natural-checkout', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...payload,requestId:lastAttempt.requestId}),
    });
    const data = await response.json();
    if (response.status === 409) {
      await loadProduct();
      if (product) setStatus('Cambió el importe. Revisa el total antes de continuar.', 'error');
      return;
    }
    if (!response.ok || !data.orderId) throw new Error(data.error || 'No fue posible iniciar el pago.');
    if (data.checkoutUrl) {
      const url = new URL(data.checkoutUrl);
      if (url.origin !== 'https://www.mercadopago.com.mx' || url.pathname !== '/checkout/v1/redirect' ||
          url.username || url.password || !/^ORD[A-Z0-9]{16,64}$/.test(url.searchParams.get('order_id') || '')) {
        throw new Error('No pudimos verificar el enlace de pago.');
      }
      window.location.assign(url.href);
    } else {
      window.location.assign('/nuestro-cafe/pago/?order=' + encodeURIComponent(data.orderId));
    }
    redirecting = true;
  } catch (error) {
    setStatus(error.message || 'No fue posible iniciar el pago.', 'error');
  } finally {
    if (!redirecting) {
      submit.disabled = false;
      busy = false;
    }
  }
});

loadProduct();
