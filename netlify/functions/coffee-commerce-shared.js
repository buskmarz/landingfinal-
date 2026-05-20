const crypto = require("crypto");
const { connectLambda, getStore } = require("@netlify/blobs");

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://bmoodcoffee.com";
const PAYMENT_MODE = process.env.PAYMENT_MODE || "sandbox";
const CURRENCY = "MXN";
const PRODUCT = Object.freeze({
  sku: process.env.COFFEE_LAVADO_SKU || "BMC-LAVADO-250G",
  title: process.env.COFFEE_LAVADO_TITLE || "Café lavado Finca Santa Cruz",
  description:
    process.env.COFFEE_LAVADO_DESCRIPTION ||
    "Café lavado de especialidad Better Mood Coffee. Bolsa de 250 g.",
  unitPrice: Number.parseInt(process.env.COFFEE_LAVADO_PRICE || "280", 10),
  currency: CURRENCY,
  weight: process.env.COFFEE_LAVADO_WEIGHT || "250 g",
});
const DELIVERY_FEE = Number.parseInt(process.env.COFFEE_DELIVERY_FEE || "60", 10);
const DELIVERY_LABEL = process.env.COFFEE_DELIVERY_LABEL || "Entrega a domicilio en Puebla";

function initNetlifyBlobs(event) {
  connectLambda(event);
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

function sanitizeText(value, max = 180) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
}

function normalizeEmail(value) {
  return sanitizeText(value, 180).toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^0-9+]/g, "").slice(0, 20);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function store(name) {
  return getStore(name);
}

async function getJSON(storeName, key) {
  return store(storeName).get(key, { type: "json" });
}

async function setJSON(storeName, key, value) {
  await store(storeName).setJSON(key, value);
}

async function listJSON(storeName, prefix = "") {
  const targetStore = store(storeName);
  const rows = [];
  let cursor;
  do {
    const result = await targetStore.list({ ...(prefix ? { prefix } : {}), ...(cursor ? { cursor } : {}) });
    for (const blob of result.blobs || []) {
      const value = await targetStore.get(blob.key, { type: "json" });
      if (value) rows.push(value);
    }
    cursor = result.cursor;
  } while (cursor);
  return rows;
}

function getClientIp(event) {
  const headers = event.headers || {};
  return String(
    headers["x-nf-client-connection-ip"] ||
      headers["client-ip"] ||
      headers["x-forwarded-for"] ||
      "unknown"
  )
    .split(",")[0]
    .trim();
}

async function checkRateLimit(scope, event, limit = 10, windowMs = 60_000) {
  const ip = getClientIp(event);
  const bucket = Math.floor(Date.now() / windowMs);
  const hash = crypto.createHash("sha256").update(`${scope}:${ip}:${bucket}`).digest("hex").slice(0, 24);
  const key = `admin_actions/rate-limit-${scope}-${hash}.json`;
  const current = await getJSON("admin_actions", key);
  const count = (current?.count || 0) + 1;
  await setJSON("admin_actions", key, { scope, bucket, count, updatedAt: new Date().toISOString() });
  return { allowed: count <= limit, count, limit };
}

function createOrderId() {
  return `BMC-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function createPaymentId() {
  return `pay_${crypto.randomUUID()}`;
}

function requireAdmin(event) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  const supplied = event.headers?.["x-admin-secret"] || event.headers?.["X-Admin-Secret"] || "";
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(supplied);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function verifyMercadoPagoSignature(event) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    return PAYMENT_MODE === "production"
      ? { ok: false, skipped: false, error: "missing_webhook_secret" }
      : { ok: true, skipped: true, warning: "missing_webhook_secret_sandbox" };
  }
  const headers = event.headers || {};
  const signature = headers["x-signature"] || headers["X-Signature"] || "";
  const requestId = headers["x-request-id"] || headers["X-Request-Id"] || "";
  const body = parseBody(event) || {};
  const dataId = event.queryStringParameters?.["data.id"] || body.data?.id || "";
  const ts = signature.match(/ts=([^,]+)/)?.[1];
  const v1 = signature.match(/v1=([^,]+)/)?.[1];
  if (!ts || !v1 || !requestId || !dataId) return { ok: false, error: "missing_signature_parts" };
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return {
    ok: expected.length === v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1)),
  };
}

function publicOrder(order, payment = null) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    paymentStatus: payment?.status || order.paymentStatus || null,
    pickupStatus: order.pickupStatus || null,
    product: order.product,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    shippingFee: order.shippingFee || 0,
    totalAmount: order.totalAmount,
    currency: order.currency,
    fulfillment: order.fulfillment,
    customerName: order.customer?.name || null,
    createdAt: order.createdAt,
    paidAt: order.paidAt || null,
  };
}

module.exports = {
  CURRENCY,
  DELIVERY_FEE,
  DELIVERY_LABEL,
  PAYMENT_MODE,
  PRODUCT,
  SITE_URL,
  checkRateLimit,
  createOrderId,
  createPaymentId,
  getJSON,
  initNetlifyBlobs,
  isValidEmail,
  json,
  listJSON,
  normalizeEmail,
  normalizePhone,
  parseBody,
  publicOrder,
  requireAdmin,
  sanitizeText,
  setJSON,
  verifyMercadoPagoSignature,
};
