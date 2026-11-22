const { createHmac, randomUUID, timingSafeEqual } = require("node:crypto");

const endpoint = "https://api.mercadopago.com/v1/orders";
const productionOrigin = "https://bmoodcoffee.com";
const productionSiteId = "3e5fbb47-ea01-4fae-b8d5-d3edd4a7118a";
const sandboxOrderStore = "coffee_orders_sandbox";

function ordersConfig() {
  const mode = process.env.COFFEE_NATURAL_PAYMENT_MODE;
  const accessToken = process.env.MERCADOPAGO_ORDERS_ACCESS_TOKEN?.trim();
  const webhookSecret = process.env.MERCADOPAGO_ORDERS_WEBHOOK_SECRET?.trim();
  const appId = process.env.MERCADOPAGO_ORDERS_APP_ID?.trim();
  if (!["sandbox", "production"].includes(mode) || !accessToken || !webhookSecret || !/^\d+$/.test(appId || "")) return null;
  if ((mode === "production") !== (process.env.SITE_ID === productionSiteId)) return null;

  try {
    const url = new URL(process.env.COFFEE_NATURAL_SITE_URL || (mode === "production" ? productionOrigin : ""));
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if ((mode === "production") !== (url.origin === productionOrigin)) return null;
    return {
      mode, accessToken, webhookSecret, appId, origin: url.origin,
      orderStore: mode === "sandbox" ? sandboxOrderStore : "coffee_orders",
    };
  } catch {
    return null;
  }
}

function isProviderOrderId(id, mode) {
  return typeof id === "string" && /^ORD[A-Z0-9]{16,64}$/.test(id) &&
    id.startsWith("ORDTST") === (mode === "sandbox");
}

function matchesOrder(resource, order, config) {
  return resource?.type === "online" && resource.processing_mode === "manual" &&
    isProviderOrderId(resource.id, config.mode) &&
    String(resource.integration_data?.application_id) === config.appId &&
    resource.external_reference === order.id && resource.currency === order.currency &&
    typeof resource.total_amount === "string" && /^\d+\.\d{2}$/.test(resource.total_amount) &&
    Number(resource.total_amount) === order.totalAmount;
}

async function createProviderOrder(order, config, idempotencyKey = randomUUID()) {
  const returnUrl = new URL("/nuestro-cafe/pago/", config.origin);
  returnUrl.searchParams.set("order", order.id);
  const items = [{ title: order.product.title, quantity: order.quantity, unit_price: order.unitPrice.toFixed(2) }];
  if (order.shippingFee > 0) items.push({ title: "Entrega en Puebla", quantity: 1, unit_price: order.shippingFee.toFixed(2) });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      type: "online",
      processing_mode: "manual",
      total_amount: order.totalAmount.toFixed(2),
      external_reference: order.id,
      expiration_time: "PT30M",
      items,
      ...(order.customer.email ? { payer: { email: order.customer.email } } : {}),
      config: { online: {
        success_url: returnUrl.href,
        pending_url: returnUrl.href,
        failure_url: returnUrl.href,
        auto_return: "all",
        retries: {allowed:true},
      } },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Mercado Pago rejected the order");
  const resource = await response.json();
  if (!matchesOrder(resource, order, config)) throw new Error("Invalid Mercado Pago order");
  const url = new URL(resource.checkout_url);
  if (url.origin !== "https://www.mercadopago.com.mx" || url.pathname !== "/checkout/v1/redirect" ||
      url.username || url.password || url.searchParams.get("order_id") !== resource.id) throw new Error("Invalid Mercado Pago checkout URL");
  return { providerOrderId: resource.id, checkoutUrl: url.href };
}

async function lookupProviderOrder(id, config) {
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
    signal: AbortSignal.timeout(6000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Mercado Pago order lookup failed");
  return response.json();
}

function validSignature(headers, id, secret) {
  const requestId = headers.get("x-request-id");
  const fields = Object.fromEntries((headers.get("x-signature") || "").split(",").map(part => part.trim().split("=")));
  if (!requestId || !/^\d{10,13}$/.test(fields.ts || "") || !/^[a-f0-9]{64}$/i.test(fields.v1 || "")) return false;
  const time = Number(fields.ts) * (fields.ts.length === 10 ? 1000 : 1);
  if (Math.abs(Date.now() - time) > 300_000) return false;
  const actual = Buffer.from(fields.v1, "hex");
  // Some Mercado Pago integrations normalize the alphanumeric identifier in the signature.
  return [id, id.toLowerCase()].some(value => {
    const manifest = `id:${value};request-id:${requestId};ts:${fields.ts};`;
    return timingSafeEqual(createHmac("sha256", secret).update(manifest).digest(), actual);
  });
}

module.exports = { createProviderOrder, isProviderOrderId, lookupProviderOrder, matchesOrder, ordersConfig, sandboxOrderStore, validSignature };
