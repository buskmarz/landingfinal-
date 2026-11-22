const {
  CURRENCY,
  DELIVERY_FEE,
  DELIVERY_LABEL,
  PAYMENT_MODE,
  getCoffeeProduct,
  naturalCheckoutAvailable,
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
const { createProviderOrder, ordersConfig } = require("../lib/coffee-mercadopago-orders.cjs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  const body = parseBody(event);
  if (!body) return json(400, { error: "JSON inválido." });
  const product = getCoffeeProduct(body.product);
  if (!product) return json(404, { error: "Café no encontrado." });
  const natural = body.product === "natural";
  const config = natural ? ordersConfig() : null;
  if (config?.mode === "production") {
    return json(409, { error: "Abre la página de Nuestro café para continuar con la compra." });
  }
  if (natural && !naturalCheckoutAvailable(product, config)) {
    return json(503, { error: "La compra de café natural aún no está disponible." });
  }
  if (!natural && !process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return json(500, { error: "MERCADOPAGO_ACCESS_TOKEN no configurado en Netlify." });
  }

  initNetlifyBlobs(event);
  const rate = await checkRateLimit("coffee-checkout", event, 10, 60_000);
  if (!rate.allowed) return json(429, { error: "Demasiados intentos. Intenta de nuevo en un minuto." });

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
  if ((!natural || email) && !isValidEmail(email)) return json(400, { error: "Ingresa un email válido." });
  if (!acceptsTerms) return json(400, { error: "Acepta las condiciones de compra." });
  if (fulfillmentMethod === "delivery" && (!deliveryAddress.street || !deliveryAddress.neighborhood)) {
    return json(400, { error: "Ingresa calle y colonia para entrega a domicilio." });
  }
  if (!Number.isFinite(product.unitPrice) || product.unitPrice <= 0) return json(500, { error: "Precio del producto no configurado." });

  const now = new Date().toISOString();
  const orderId = createOrderId();
  const paymentId = createPaymentId();
  const shippingFee = fulfillmentMethod === "delivery" ? DELIVERY_FEE : 0;
  const totalAmount = Number((product.unitPrice * quantity + shippingFee).toFixed(2));

  if (natural && body.expectedTotal !== undefined && body.expectedTotal !== totalAmount) {
    return json(409, { error: "Cambió el importe. Revisa el total antes de continuar." });
  }

  const order = {
    id: orderId,
    status: "pending_payment",
    paymentStatus: "pending",
    pickupStatus: "not_ready",
    source: natural ? "cafe_natural_page" : "cafe_lavado_page",
    product,
    quantity,
    unitPrice: product.unitPrice,
    shippingFee,
    totalAmount,
    currency: CURRENCY,
    fulfillment: {
      method: fulfillmentMethod,
      label: fulfillmentMethod === "delivery" ? DELIVERY_LABEL : "Recoger en Better Mood Coffee La Paz",
      address: "13 Poniente 2302/F, Col. La Paz, Puebla",
      deliveryAddress: fulfillmentMethod === "delivery" ? deliveryAddress : null,
    },
    customer: { name, phone, ...(email ? { email } : {}) },
    notes,
    paymentId,
    createdAt: now,
    updatedAt: now,
    paidAt: null,
  };

  if (natural) {
    let provider;
    try {
      provider = await createProviderOrder(order, config);
    } catch {
      return json(502, { error: "No fue posible iniciar el pago. Intenta de nuevo." });
    }
    await setJSON(config.orderStore, `orders/${orderId}.json`, { ...order, providerOrderId: provider.providerOrderId });
    return json(200, { orderId, paymentId, checkoutUrl: provider.checkoutUrl });
  }

  const preferenceBody = {
    items: [
      {
        id: product.sku,
        title: product.title,
        description: product.description,
        quantity,
        unit_price: product.unitPrice,
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
      sku: product.sku,
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

  return saveCheckout(order, { preferenceId: preference.id, rawProviderResponse: preference }, checkoutUrl);
};

async function saveCheckout(order, providerRecord, checkoutUrl) {
  const { id: orderId, paymentId, createdAt: now } = order;
  const payment = {
    id: paymentId,
    orderId,
    amount: order.totalAmount,
    currency: order.currency,
    provider: "mercado_pago",
    providerPaymentId: null,
    checkoutUrl,
    externalReference: orderId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    ...providerRecord,
  };

  await Promise.all([
    setJSON("coffee_orders", `orders/${orderId}.json`, order),
    setJSON("coffee_payments", `payments/${paymentId}.json`, payment),
  ]);

  return json(200, {
    orderId, paymentId, checkoutUrl, init_point: checkoutUrl,
    ...(providerRecord.preferenceId ? { preferenceId: providerRecord.preferenceId } : {}),
  });
}
