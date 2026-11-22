const status = document.querySelector('[data-order-status]');
const refresh = document.querySelector('[data-refresh-order]');
const order = new URLSearchParams(window.location.search).get('order');

function render(message, tone = 'neutral') {
  status.textContent = message;
  status.dataset.tone = tone;
}

function releaseDraft(id) {
  try {
    const key = 'bm-natural-purchase';
    const draft = JSON.parse(sessionStorage.getItem(key));
    const identifier = draft?.requestId?.replace(/-/g,'').toUpperCase() || '';
    if (id === 'BMC-' + identifier.slice(0,24) + '-' + identifier.slice(24)) sessionStorage.removeItem(key);
  } catch (_) { /* Status can still be read without browser storage. */ }
}

async function checkOrder() {
  if (!order) {
    render('No encontramos el identificador del pedido.', 'error');
    refresh.disabled = true;
    return;
  }

  refresh.disabled = true;
  render('Consultando estado del pedido…');
  try {
    const response = await fetch('/api/coffee-payment-status?order=' + encodeURIComponent(order));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No pudimos consultar el pedido.');
    const info = data.order;
    if (info.paymentStatus === 'paid' || info.status === 'paid') {
      releaseDraft(info.id);
      const message = info.pickupStatus === 'fulfilled' ? 'Pedido entregado.' : info.pickupStatus === 'ready'
        ? (info.fulfillment?.method === 'delivery' ? 'Tu pedido está listo para envío.' : 'Tu café está listo para recoger en Better Mood La Paz.')
        : 'Pago confirmado. Recibimos tu pedido.';
      render(message + ' Folio ' + info.id + '.', 'success');
    } else if (info.paymentStatus === 'review') {
      render('El pago del pedido ' + info.id + ' requiere revisión. Contacta a Better Mood.', 'error');
    } else if (info.checkoutClosed) {
      releaseDraft(info.id);
      render('El enlace de pago venció. Puedes comenzar otro pedido.', 'error');
    } else if (info.paymentStatus === 'failed' || info.status === 'payment_failed') {
      render('El pago del pedido ' + info.id + ' no fue aprobado.', 'error');
    } else {
      render('Pedido ' + info.id + ' pendiente de confirmación.');
    }
  } catch (error) {
    render(error.message || 'No pudimos consultar el pedido.', 'error');
  } finally {
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', checkOrder);
checkOrder();
