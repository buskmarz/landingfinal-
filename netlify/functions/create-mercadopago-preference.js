const crypto = require("crypto");
const {
  initNetlifyBlobs,
  CURRENCY,
  KIT_PRICE,
  PAYMENT_MODE,
  SITE_URL,
  getJSON,
  json,
  parseBody,
  setJSON,
} = require("./quiniela-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) return json(500, { error: "MERCADOPAGO_ACCESS_TOKEN no configurado." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "JSON inválido." });

  const participantId = String(body.participantId || "");
  const folioCode = String(body.folioCode || "").toUpperCase();
  const folio = await getJSON("folios", `folios/${folioCode}.json`);
  if (!folio || folio.participantId !== participantId) return json(404, { error: "Folio reservado no encontrado." });
  if (folio.status !== "pending_payment") return json(409, { error: "El folio no está pendiente de pago." });

  const participant = await getJSON("participants", `participants/${participantId}.json`);
  if (!participant) return json(404, { error: "Participante no encontrado." });

  const now = new Date().toISOString();
  const paymentId = crypto.randomUUID();
  const preferenceBody = {
    items: [
      {
        title: "Kit Better Mood Futbolero",
        description: "Folio digital, cartón físico y beneficios Better Mood",
        quantity: 1,
        unit_price: KIT_PRICE,
        currency_id: CURRENCY,
      },
    ],
    payer: {
      name: participant.name,
      email: participant.email,
    },
    external_reference: folioCode,
    metadata: {
      participantId,
      folioId: folio.id,
      folioCode,
      source: "quiniela_2026",
      product: "kit_better_mood_futbolero",
      paymentId,
    },
    back_urls: {
      success: `${SITE_URL}/quiniela/pago-exitoso/?folio=${encodeURIComponent(folioCode)}`,
      failure: `${SITE_URL}/quiniela/pago-error/?folio=${encodeURIComponent(folioCode)}`,
      pending: `${SITE_URL}/quiniela/pago-pendiente/?folio=${encodeURIComponent(folioCode)}`,
    },
    auto_return: "approved",
    notification_url: `${SITE_URL}/.netlify/functions/mercadopago-webhook`,
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferenceBody),
  });
  const preference = await response.json();
  if (!response.ok) return json(502, { error: "No fue posible crear la preferencia.", details: preference });

  const checkoutUrl = PAYMENT_MODE === "sandbox"
    ? preference.sandbox_init_point || preference.init_point
    : preference.init_point || preference.sandbox_init_point;
  const payment = {
    id: paymentId,
    participantId,
    folioId: folio.id,
    folioCode,
    amount: KIT_PRICE,
    currency: CURRENCY,
    provider: "mercado_pago",
    preferenceId: preference.id,
    providerPaymentId: null,
    checkoutUrl,
    externalReference: folioCode,
    status: "pending",
    rawProviderResponse: preference,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
  };

  await setJSON("payments", `payments/${paymentId}.json`, payment);
  folio.paymentId = paymentId;
  folio.updatedAt = now;
  await setJSON("folios", `folios/${folioCode}.json`, folio);

  return json(200, {
    paymentId,
    preferenceId: preference.id,
    init_point: checkoutUrl,
    checkoutUrl,
    folioCode,
  });
};
