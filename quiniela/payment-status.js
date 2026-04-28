const params = new URLSearchParams(window.location.search);
const folio = String(params.get('folio') || '').toUpperCase();
const title = document.querySelector('#status-title');
const copy = document.querySelector('#status-copy');
const feedback = document.querySelector('#feedback');
const predictLink = document.querySelector('#predict-link');
const verifyButton = document.querySelector('#verify-status');
const copyButton = document.querySelector('#copy-folio');

if (predictLink && folio) predictLink.href = `../?folio=${encodeURIComponent(folio)}#predicciones`;
verifyButton?.addEventListener('click', verifyStatus);
copyButton?.addEventListener('click', copyFolio);
verifyStatus();

async function verifyStatus() {
  if (!folio) {
    feedback.textContent = 'No encontramos folio en la URL.';
    return;
  }
  feedback.textContent = 'Consultando estado...';
  try {
    const response = await fetch(`/.netlify/functions/folio-status?folio=${encodeURIComponent(folio)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No pudimos consultar el estado.');

    if (payload.canPredict) {
      title.textContent = 'Tu folio está activo';
      copy.textContent = 'Ya puedes registrar tus marcadores.';
      feedback.textContent = `Folio activo: ${payload.folioCode}`;
      track('mercado_pago_payment_approved', { folio });
      track('folio_activated', { folio });
      return;
    }

    title.textContent = 'Estamos confirmando tu pago';
    const folioStatus = payload.folioStatus || payload.status;
    copy.textContent = folioStatus === 'pending_payment'
      ? 'Tu folio está reservado. Mercado Pago puede tardar unos segundos en confirmar.'
      : 'Si ya pagaste y esto persiste, pide ayuda en cafetería.';
    feedback.textContent = `Estado actual: ${folioStatus || 'sin estado'}`;
    track('mercado_pago_payment_pending', { folio, status: folioStatus });
  } catch (error) {
    feedback.textContent = error.message;
  }
}

function track(eventName, payload = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
  console.info('[BetterMood Analytics]', eventName, payload);
}

async function copyFolio() {
  if (!folio) return;
  try {
    await navigator.clipboard.writeText(folio);
    feedback.textContent = 'Folio copiado.';
  } catch (error) {
    feedback.textContent = `Tu folio: ${folio}`;
  }
}
