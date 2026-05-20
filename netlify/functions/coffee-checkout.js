const {
  CURRENCY,
  DELIVERY_FEE,
  DELIVERY_LABEL,
  PAYMENT_MODE,
  PRODUCT,
  SITE_URL,
  checkRateLimit,
  createOrderId,
  createPaymentId,
  initNetlifyBlobs,
  isValidEmail,
  json,
  normalizeEmail,
  normalizePhone,
  parseBody,
  sanitizeText,
  setJSON,
} = require("./coffee-commerce-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return json(500, { error: "MERCADOPAGO_ACCESS_TOKEN no configurado en Netlify." });
  }

  const rate = await checkRateLimit("coffee-checkout", event, 10, 60_000);
  if (!rate.allowed) return json(429, { error: "Demasiados intentos. Intenta de nuevo en un minuto." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "JSON inválido." });

  const name = sanitizeText(body.name, 120);
  const phone = normalizePhone(body.phone);
  const email = normalizeEmail(body.email);
  const quantity = Math.min(Math.max(Number.parseInt(body.quantity || "1", 10) || 1, 1), 6);
  const fulfillmentMethod = ["pickup", "delivery"].includes(body.fulfillmentMethod) ? body.fulfillmentMethod : "pickup";
  const deliveryAddress = {
    street: sanitizeText(body.deliveryStreet, 160),
    neighborhood: sanitizeText(body.deliveryNeighborhood, 120),
    city: sanitizeText(body.deliveryCity || "Puebla", 80),
    references: sanitizeText(body.deliveryReferences, 220),
  };
  const notes = sanitizeText(body.notes, 240);
  const acceptsTerms = body.acceptsTerms === true;

  if (!name) return json(400, { error: "Ingresa tu nombre." });
  if (!phone || phone.length < 8) return json(400, { error: "Ingresa un WhatsApp válido." });
  if (!email || !isValidEmail(email)) return json(400, { error: "Ingresa un email válido." });
  if (!acceptsTerms) return json(400, { error: "Acepta las condiciones de compra." });
  if (fulfillmentMethod === "delivery" && (!deliveryAddress.street || !deliveryAddress.neighborhood)) {
    return json(400, { error: "Ingresa calle y colonia para entrega a domicilio." });
  }
  if (!Number.isFinite(PRODUCT.unitPrice) || PRODUCT.unitPrice <= 0) return json(500, { error: "Precio del producto no configurado." });

  const now = new Date().toISOString();
  const orderId = createOrderId();
  const paymentId = createPaymentId();
  const shippingFee = fulfillmentMethod === "delivery" ? DELIVERY_FEE : 0;
  const totalAmount = (PRODUCT.unitPrice * quantity) + shippingFee;

  const order = {
    id: orderId,
    status: "pending_payment",
    paymentStatus: "pending",
    pickupStatus: "not_ready",
    source: "cafe_lavado_page",
    product: PRODUCT,
    quantity,
    unitPrice: PRODUCT.unitPrice,
    shippingFee,
    totalAmount,
    currency: CURRENCY,
    fulfillment: {
      method: fulfillmentMethod,
      label: fulfillmentMethod === "delivery" ? DELIVERY_LABEL : "Recoger en Better Mood Coffee La Paz",
      address: "13 Poniente 2302/F, Col. La Paz, Puebla",
      deliveryAddress: fulfillmentMethod === "delivery" ? deliveryAddress : null,
    },
    customer: { name, phone, email },
    notes,
    paymentId,
    createdAt: now,
    updatedAt: now,
    paidAt: null,
  };

  const preferenceBody = {
    items: [
      {
        id: PRODUCT.sku,
        title: PRODUCT.title,
        description: PRODUCT.description,
        quantity,
        unit_price: PRODUCT.unitPrice,
        currency_id: CURRENCY,
      },
    ],
    payer: { name, email, phone: { number: phone } },
    external_reference: orderId,
    metadata: {
      orderId,
      paymentId,
      source: "better_mood_cafe_lavado",
      product: "cafe_lavado",
      sku: PRODUCT.sku,
      quantity,
    },
    back_urls: {
      success: `${SITE_URL}/cafe-lavado/pago-exitoso/?order=${encodeURIComponent(orderId)}`,
      failure: `${SITE_URL}/cafe-lavado/pago-error/?order=${encodeURIComponent(orderId)}`,
      pending: `${SITE_URL}/cafe-lavado/pago-pendiente/?order=${encodeURIComponent(orderId)}`,
    },
    auto_return: "approved",
    notification_url: `${SITE_URL}/.netlify/functions/coffee-mercadopago-webhook?source_news=webhooks`,
  };
  if (shippingFee > 0) {
    preferenceBody.shipments = {
      cost: shippingFee,
      mode: "not_specified",
    };
  }

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferenceBody),
  });
  const preference = await response.json().catch(() => ({}));
  if (!response.ok) return json(502, { error: "No fue posible crear el checkout de Mercado Pago.", details: preference });

  const checkoutUrl = PAYMENT_MODE === "sandbox"
    ? preference.sandbox_init_point || preference.init_point
    : preference.init_point || preference.sandbox_init_point;

  const payment = {
    id: paymentId,
    orderId,
    amount: totalAmount,
    currency: CURRENCY,
    provider: "mercado_pago",
    preferenceId: preference.id,
    providerPaymentId: null,
    checkoutUrl,
    externalReference: orderId,
    status: "pending",
    rawProviderResponse: preference,
    createdAt: now,
    updatedAt: now,
    paidAt: null,
  };

  await Promise.all([
    setJSON("coffee_orders", `orders/${orderId}.json`, order),
    setJSON("coffee_payments", `payments/${paymentId}.json`, payment),
  ]);

  return json(200, { orderId, paymentId, checkoutUrl, init_point: checkoutUrl, preferenceId: preference.id });
};
