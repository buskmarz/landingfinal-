const {
  initNetlifyBlobs,
  CURRENCY,
  KIT_PRICE,
  getJSON,
  json,
  makeQrUrl,
  parseBody,
  setJSON,
  verifyMercadoPagoSignature,
} = require("./football-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = parseBody(event);
  if (!body) return json(200, { received: true, ignored: "invalid_json" });

  const incomingPaymentId = getProviderPaymentId(body);
  const eventId = String(body.id || `${body.action || body.type || body.topic || "event"}-${incomingPaymentId || "unknown"}-${Date.now()}`);
  const eventKey = `webhook_events/mercadopago/${eventId}.json`;
  const existingEvent = await getJSON("webhook_events", eventKey);
  if (existingEvent?.processed) return json(200, { received: true, duplicate: true });

  const signature = verifyMercadoPagoSignature(event);
  const webhookEvent = {
    id: eventId,
    provider: "mercado_pago",
    eventId,
    providerPaymentId: body.data?.id ? String(body.data.id) : null,
    type: body.type || body.topic || null,
    action: body.action || null,
    externalReference: null,
    payload: body,
    signature,
    processed: false,
    processedAt: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  await setJSON("webhook_events", eventKey, webhookEvent);

  if (!signature.ok) {
    webhookEvent.error = "invalid_signature";
    await setJSON("webhook_events", eventKey, webhookEvent);
    return json(401, { error: "Invalid signature" });
  }

  const isPaymentEvent = body.type === "payment" || body.topic === "payment";
  const providerPaymentId = incomingPaymentId;
  if (!isPaymentEvent || !providerPaymentId) {
    webhookEvent.processed = true;
    webhookEvent.processedAt = new Date().toISOString();
    await setJSON("webhook_events", eventKey, webhookEvent);
    return json(200, { received: true, ignored: "not_payment" });
  }

  try {
    const payment = await fetchMercadoPagoPayment(providerPaymentId);
    const folioCode = String(payment.external_reference || payment.metadata?.folioCode || payment.metadata?.folio_code || "").toUpperCase();
    webhookEvent.externalReference = folioCode || null;
    webhookEvent.providerPaymentId = String(payment.id);

    if (!folioCode) throw new Error("missing_external_reference");

    const folio = await getJSON("folios", `folios/${folioCode}.json`);
    if (!folio) throw new Error("folio_not_found");

    const internalPayment = await findInternalPayment(folio, payment);
    const now = new Date().toISOString();
    const normalizedPayment = {
      ...(internalPayment || {}),
      id: internalPayment?.id || payment.metadata?.payment_id || payment.metadata?.paymentId || String(payment.id),
      participantId: internalPayment?.participantId || folio.participantId,
      folioId: folio.id,
      amount: Number(payment.transaction_amount),
      currency: payment.currency_id,
      provider: "mercado_pago",
      providerPaymentId: String(payment.id),
      externalReference: folioCode,
      rawProviderResponse: payment,
      updatedAt: now,
    };

    if (payment.status === "approved" && (Number(payment.transaction_amount) !== KIT_PRICE || payment.currency_id !== CURRENCY)) {
      normalizedPayment.status = "failed";
      normalizedPayment.error = "invalid_amount_or_currency";
      await setJSON("payments", `payments/${normalizedPayment.id}.json`, normalizedPayment);
      throw new Error("invalid_amount_or_currency");
    }

    if (payment.status === "approved") {
      normalizedPayment.status = "paid";
      normalizedPayment.paidAt = payment.date_approved || now;
      await setJSON("payments", `payments/${normalizedPayment.id}.json`, normalizedPayment);

      if (folio.status !== "active") {
        const participant = await getJSON("participants", `participants/${folio.participantId}.json`);
        const updatedFolio = {
          ...folio,
          status: "active",
          qrUrl: folio.qrUrl || makeQrUrl(folioCode),
          paymentId: normalizedPayment.id,
          activatedAt: now,
          updatedAt: now,
        };
        await setJSON("folios", `folios/${folioCode}.json`, updatedFolio);
        if (participant) {
          await setJSON("participants", `participants/${participant.id}.json`, {
            ...participant,
            status: "active",
            updatedAt: now,
          });
        }
      }
    } else if (["rejected", "cancelled", "canceled"].includes(payment.status)) {
      normalizedPayment.status = "failed";
      await setJSON("payments", `payments/${normalizedPayment.id}.json`, normalizedPayment);
    } else {
      normalizedPayment.status = "pending";
      await setJSON("payments", `payments/${normalizedPayment.id}.json`, normalizedPayment);
    }

    webhookEvent.processed = true;
    webhookEvent.processedAt = now;
    await setJSON("webhook_events", eventKey, webhookEvent);
    return json(200, { received: true, processed: true });
  } catch (error) {
    webhookEvent.error = error.message;
    await setJSON("webhook_events", eventKey, webhookEvent);
    return json(200, { received: true, processed: false, error: error.message });
  }
};

function getProviderPaymentId(body) {
  if (body.data?.id) return String(body.data.id);
  if (body.topic === "payment" && body.id) return String(body.id);
  if (typeof body.resource === "string") {
    const parts = body.resource.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
  return null;
}

async function fetchMercadoPagoPayment(providerPaymentId) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("missing_mercadopago_access_token");

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(providerPaymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "mercadopago_payment_lookup_failed");
  return payload;
}

async function findInternalPayment(folio, providerPayment) {
  if (folio.paymentId) {
    const byFolio = await getJSON("payments", `payments/${folio.paymentId}.json`);
    if (byFolio) return byFolio;
  }
  const metadataId = providerPayment.metadata?.payment_id || providerPayment.metadata?.paymentId;
  if (metadataId) {
    const byMetadata = await getJSON("payments", `payments/${metadataId}.json`);
    if (byMetadata) return byMetadata;
  }
  return null;
}
