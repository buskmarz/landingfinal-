const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const { connectLambda, getStore } = require("@netlify/blobs");

const KIT_PRICE = 99;
const CURRENCY = "MXN";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://bmoodcoffee.com";
const PAYMENT_MODE = process.env.PAYMENT_MODE || "sandbox";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return null;
  }
}

function sanitizeText(value, max = 160) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
}

function normalizeFolio(value) {
  return String(value || "").trim().toUpperCase();
}

function store(name) {
  return getStore(name);
}

function initNetlifyBlobs(event) {
  connectLambda(event);
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

async function checkRateLimit(scope, event, limit = 20, windowMs = 60_000) {
  const ip = getClientIp(event);
  const bucket = Math.floor(Date.now() / windowMs);
  const hash = crypto.createHash("sha256").update(`${scope}:${ip}:${bucket}`).digest("hex").slice(0, 24);
  const key = `admin_actions/rate-limit-${hash}.json`;
  const current = await getJSON("admin_actions", key);
  const count = (current?.count || 0) + 1;
  await setJSON("admin_actions", key, { scope, bucket, count, updatedAt: new Date().toISOString() });
  return { allowed: count <= limit, count, limit };
}

function getClientIp(event) {
  return String(
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    event.headers["x-forwarded-for"] ||
    "unknown"
  ).split(",")[0].trim();
}

async function loadStaticData() {
  const filePath = path.join(process.cwd(), "quiniela/data/mockData.js");
  const source = fs.readFileSync(filePath, "utf8")
    .replaceAll("export const ", "const ")
    .replaceAll("export function ", "function ");
  const context = { console };
  vm.createContext(context);
  vm.runInContext(`${source}\nresult = { matches: MOCK_MATCHES, phases: PHASES };`, context, { filename: "mockData.js" });
  return context.result || { matches: [], phases: [] };
}

async function ensureSeedData() {
  const { matches, phases } = await loadStaticData();
  const matchesStore = store("matches");
  const phasesStore = store("phases");
  await Promise.all(matches.map((match) => matchesStore.setJSON(`matches/${match.id}.json`, match)));
  await Promise.all(phases.map((phase) => phasesStore.setJSON(`phases/${phase.id}.json`, phase)));
  return { matches, phases };
}

async function getMatch(matchId) {
  const stored = await getJSON("matches", `matches/${matchId}.json`);
  if (stored) return stored;
  const { matches } = await ensureSeedData();
  return matches.find((match) => match.id === matchId) || null;
}

async function getMatches() {
  const rows = await listJSON("matches", "matches/");
  if (rows.length) return rows;
  const seeded = await ensureSeedData();
  return seeded.matches;
}

async function getActiveFolios() {
  const folios = await listJSON("folios", "folios/");
  return folios.filter((folio) => folio.status === "active");
}

async function generateFolioCode() {
  const folios = await listJSON("folios", "folios/");
  const used = new Set(folios.map((folio) => folio.folioCode));
  let next = 1;
  while (used.has(`BM26-${String(next).padStart(6, "0")}`)) next += 1;
  return `BM26-${String(next).padStart(6, "0")}`;
}

function makeQrUrl(folioCode) {
  const target = encodeURIComponent(`${SITE_URL}/quiniela/?folio=${folioCode}#predicciones`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${target}`;
}

function calculateMatchPoints(prediction, match) {
  if (match.homeScoreResult === null || match.awayScoreResult === null || match.homeScoreResult === undefined || match.awayScoreResult === undefined) {
    return null;
  }
  if (prediction.homeScorePrediction === match.homeScoreResult && prediction.awayScorePrediction === match.awayScoreResult) {
    return { points: 5, exact: true, correct: true };
  }
  const predicted = Math.sign(prediction.homeScorePrediction - prediction.awayScorePrediction);
  const actual = Math.sign(match.homeScoreResult - match.awayScoreResult);
  if (predicted === actual) return { points: 3, exact: false, correct: true };
  return { points: 0, exact: false, correct: false };
}

function requireAdmin(event) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  const supplied = event.headers["x-admin-secret"] || event.headers["X-Admin-Secret"] || "";
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
  const signature = event.headers["x-signature"] || event.headers["X-Signature"] || "";
  const requestId = event.headers["x-request-id"] || event.headers["X-Request-Id"] || "";
  const body = parseBody(event) || {};
  const dataId = event.queryStringParameters?.["data.id"] || body.data?.id || "";
  const ts = signature.match(/ts=([^,]+)/)?.[1];
  const v1 = signature.match(/v1=([^,]+)/)?.[1];
  if (!ts || !v1 || !requestId || !dataId) return { ok: false };
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return { ok: expected.length === v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1)) };
}

module.exports = {
  CURRENCY,
  KIT_PRICE,
  PAYMENT_MODE,
  SITE_URL,
  calculateMatchPoints,
  checkRateLimit,
  generateFolioCode,
  getActiveFolios,
  getJSON,
  getMatch,
  getMatches,
  initNetlifyBlobs,
  json,
  listJSON,
  makeQrUrl,
  normalizeFolio,
  parseBody,
  requireAdmin,
  sanitizeText,
  setJSON,
  verifyMercadoPagoSignature,
};
