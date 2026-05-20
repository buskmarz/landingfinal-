const {
  CURRENCY,
  getJSON,
  initNetlifyBlobs,
  json,
  parseBody,
  setJSON,
  verifyMercadoPagoSignature,
} = require("./coffee-commerce-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" }, { Allow: "POST" });

  const body = parseBody(event);
  if (!body) return json(200, { received: true, ignored: "invalid_json" });

  const incomingPaymentId = getProviderPaymentId(body);
  const eventId = String(body.id || `${body.action || body.type || body.topic || "event"}-${incomingPaymentId || "unknown"}-${Date.now()}`);
  const eventKey = `webhook_events/coffee-mercadopago/${eventId}.json`;
  const existingEvent = await getJSON("webhook_events", eventKey);
  if (existingEvent?.processed) return json(200, { received: true, duplicate: true });

  const signature = verifyMercadoPagoSignature(event);
  const webhookEvent = {
    id: eventId,
    provider: "mercado_pago",
    eventId,
    providerPaymentId: incomingPaymentId || null,
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
  if (!isPaymentEvent || !incomingPaymentId) {
    webhookEvent.processed = true;
    webhookEvent.processedAt = new Date().toISOString();
    await setJSON("webhook_events", eventKey, webhookEvent);
    return json(200, { received: true, ignored: "not_payment" });
  }

  try {
    const providerPayment = await fetchMercadoPagoPayment(incomingPaymentId);
    const orderId = String(providerPayment.external_reference || providerPayment.metadata?.orderId || providerPayment.metadata?.order_id || "").trim();
    if (!orderId) throw new Error("missing_external_reference");

    webhookEvent.externalReference = orderId;
    webhookEvent.providerPaymentId = String(providerPayment.id);

    const order = await getJSON("coffee_orders", `orders/${orderId}.json`);
    if (!order) throw new Error("order_not_found");
    const paymentId = order.paymentId || providerPayment.metadata?.paymentId || providerPayment.metadata?.payment_id || String(providerPayment.id);
    const existingPayment = await getJSON("coffee_payments", `payments/${paymentId}.json`);
    const now = new Date().toISOString();

    const normalizedPayment = {
      ...(existingPayment || {}),
      id: paymentId,
      orderId,
      amount: Number(providerPayment.transaction_amount),
      currency: providerPayment.currency_id,
      provider: "mercado_pago",
      providerPaymentId: String(providerPayment.id),
      externalReference: orderId,
      rawProviderResponse: providerPayment,
      updatedAt: now,
    };

    const expectedAmount = Number(order.totalAmount);
    if (providerPayment.status === "approved" && (Number(providerPayment.transaction_amount) !== expectedAmount || providerPayment.currency_id !== CURRENCY)) {
      normalizedPayment.status = "failed";
      normalizedPayment.error = "invalid_amount_or_currency";
      await setJSON("coffee_payments", `payments/${paymentId}.json`, normalizedPayment);
      throw new Error("invalid_amount_or_currency");
    }

    if (providerPayment.status === "approved") {
      normalizedPayment.status = "paid";
      normalizedPayment.paidAt = providerPayment.date_approved || now;
      await setJSON("coffee_payments", `payments/${paymentId}.json`, normalizedPayment);

      if (order.status !== "paid") {
        await setJSON("coffee_orders", `orders/${orderId}.json`, {
          ...order,
          status: "paid",
          paymentStatus: "paid",
          pickupStatus: "pending_pickup",
          providerPaymentId: String(providerPayment.id),
          paidAt: normalizedPayment.paidAt,
          updatedAt: now,
        });
      }
    } else if (["rejected", "cancelled", "canceled"].includes(providerPayment.status)) {
      normalizedPayment.status = "failed";
      await setJSON("coffee_payments", `payments/${paymentId}.json`, normalizedPayment);
      await setJSON("coffee_orders", `orders/${orderId}.json`, {
        ...order,
        status: "payment_failed",
        paymentStatus: "failed",
        updatedAt: now,
      });
    } else {
      normalizedPayment.status = "pending";
      await setJSON("coffee_payments", `payments/${paymentId}.json`, normalizedPayment);
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
