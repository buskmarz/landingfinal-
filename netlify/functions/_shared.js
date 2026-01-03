const crypto = require("crypto");

let blobsModule = null;
async function getBlobsModule() {
  if (blobsModule) return blobsModule;
  try {
    blobsModule = require("@netlify/blobs");
  } catch (err) {
    blobsModule = await import("@netlify/blobs");
  }
  return blobsModule;
}

async function initBlobsContext(event) {
  if (!event || !event.blobs) return;
  const mod = await getBlobsModule();
  const connectFn = mod.connectLambda || (mod.default && mod.default.connectLambda);
  if (connectFn) {
    connectFn(event);
  }
}

async function getStoreClient() {
  const mod = await getBlobsModule();
  const getStoreFn = mod.getStore || (mod.default && mod.default.getStore);
  if (!getStoreFn) throw new Error("Netlify Blobs no disponible.");
  return getStoreFn(STORE_NAME);
}

const STORE_NAME = process.env.DROPPY_STORE || "droppy-dash";
const LEADERBOARD_KEY = "leaderboard";
const SECRET = process.env.DROPPY_SECRET || "dev-secret-change-me";
const WEEK_TZ = process.env.DROPPY_WEEK_TZ || "America/Mexico_City";

const SESSION_TTL_MS = Number.parseInt(process.env.DROPPY_SESSION_TTL_MS || "900000", 10);
const COOLDOWN_SECONDS = Number.parseInt(process.env.DROPPY_COOLDOWN_SECONDS || "12", 10);
const MAX_PER_MINUTE = Number.parseInt(process.env.DROPPY_MAX_PER_MINUTE || "6", 10);
const MAX_ENTRIES = Number.parseInt(process.env.DROPPY_MAX_ENTRIES || "10000", 10);

const MAX_DISTANCE_PER_SEC = Number.parseInt(process.env.DROPPY_MAX_DISTANCE_PER_SEC || "70", 10);
const MAX_SCORE_PER_SEC = Number.parseInt(process.env.DROPPY_MAX_SCORE_PER_SEC || "180", 10);
const MAX_COLLECTIBLES_PER_SEC = Number.parseInt(process.env.DROPPY_MAX_COLLECTIBLES_PER_SEC || "3", 10);
const MAX_COMBO = Number.parseInt(process.env.DROPPY_MAX_COMBO || "5", 10);

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

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input) {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

function signToken(payload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(crypto.createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = base64UrlEncode(crypto.createHmac("sha256", SECRET).update(body).digest());
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getClientIp(event) {
  const headers = event.headers || {};
  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"] || "";
  return (
    headers["x-nf-client-connection-ip"] ||
    headers["client-ip"] ||
    forwarded.split(",")[0].trim() ||
    ""
  );
}

function getUserAgent(event) {
  const headers = event.headers || {};
  return headers["user-agent"] || headers["User-Agent"] || "";
}

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function getZonedDate(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function getTimeZoneMidnight(year, month, day, timeZone) {
  const utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = getTimeZoneOffsetMs(new Date(utc), timeZone);
  return new Date(utc - offset);
}

function formatDateKey(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function formatMonthKey(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function getWeekStartDate(date = new Date()) {
  const parts = getZonedParts(date, WEEK_TZ);
  const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const weekday = localDate.getUTCDay();
  const diff = (weekday + 6) % 7;
  localDate.setUTCDate(localDate.getUTCDate() - diff);
  return getTimeZoneMidnight(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth() + 1,
    localDate.getUTCDate(),
    WEEK_TZ
  );
}

function getMonthStartDate(date = new Date()) {
  const parts = getZonedParts(date, WEEK_TZ);
  return getTimeZoneMidnight(parts.year, parts.month, 1, WEEK_TZ);
}

function getPeriodMeta(period, date = new Date()) {
  if (period === "monthly") {
    const start = getMonthStartDate(date);
    return { startMs: start.getTime(), label: formatMonthKey(start, WEEK_TZ) };
  }
  if (period === "weekly") {
    const start = getWeekStartDate(date);
    return { startMs: start.getTime(), label: formatDateKey(start, WEEK_TZ) };
  }
  return { startMs: 0, label: "Histórico" };
}

async function loadState(event) {
  await initBlobsContext(event);
  const store = await getStoreClient();
  const data = await store.get(LEADERBOARD_KEY, { type: "json" });
  if (!data) {
    return {
      entries: [],
      rate: {},
      usedSessions: {},
      visitStats: {
        total: 0,
        byDay: {},
        lastByFp: {},
      },
    };
  }
  return {
    ...data,
    entries: Array.isArray(data.entries) ? data.entries : [],
    rate: data.rate || {},
    usedSessions: data.usedSessions || {},
    visitStats: data.visitStats || { total: 0, byDay: {}, lastByFp: {} },
  };
}

async function saveState(state) {
  const store = await getStoreClient();
  await store.set(LEADERBOARD_KEY, JSON.stringify(state), { contentType: "application/json" });
}

function pruneRateMap(rate, now) {
  const cutoff = now - 24 * 60 * 60 * 1000;
  Object.keys(rate).forEach((key) => {
    if (!rate[key] || rate[key].last < cutoff) delete rate[key];
  });
}

function applyRateLimit(state, key, now) {
  if (!key) return { ok: true };
  if (!state.rate) state.rate = {};

  pruneRateMap(state.rate, now);
  const entry = state.rate[key] || { last: 0, windowStart: now, count: 0 };

  if (now - entry.last < COOLDOWN_SECONDS * 1000) {
    const retryAfter = Math.ceil((COOLDOWN_SECONDS * 1000 - (now - entry.last)) / 1000);
    return { ok: false, retryAfter };
  }

  if (now - entry.windowStart > 60 * 1000) {
    entry.windowStart = now;
    entry.count = 0;
  }

  if (entry.count >= MAX_PER_MINUTE) {
    return { ok: false, retryAfter: 60 };
  }

  entry.last = now;
  entry.count += 1;
  state.rate[key] = entry;
  return { ok: true };
}

function markSessionUsed(state, sessionId, now) {
  if (!sessionId) return;
  if (!state.usedSessions) state.usedSessions = {};
  state.usedSessions[sessionId] = now;
}

function isSessionUsed(state, sessionId) {
  return Boolean(state.usedSessions && state.usedSessions[sessionId]);
}

function pruneSessions(state, now) {
  if (!state.usedSessions) return;
  const cutoff = now - 24 * 60 * 60 * 1000;
  Object.keys(state.usedSessions).forEach((key) => {
    if (state.usedSessions[key] < cutoff) delete state.usedSessions[key];
  });
}

function sanitizeName(input, maxLen = 24) {
  const text = String(input || "").trim().replace(/\s+/g, " ");
  const safe = text.replace(/[^a-zA-Z0-9@._\-\sáéíóúÁÉÍÓÚñÑ]/g, "");
  return safe.slice(0, maxLen);
}

function sanitizePhone(input, maxLen = 18) {
  const text = String(input || "").trim();
  const safe = text.replace(/[^0-9+\s()-]/g, "");
  return safe.slice(0, maxLen);
}

function sanitizeContact(input, maxLen = 32) {
  const text = String(input || "").trim().replace(/\s+/g, " ");
  const safe = text.replace(/[^a-zA-Z0-9@._+\s()-]/g, "");
  return safe.slice(0, maxLen);
}

module.exports = {
  json,
  signToken,
  verifyToken,
  hashValue,
  getClientIp,
  getUserAgent,
  getPeriodMeta,
  loadState,
  saveState,
  applyRateLimit,
  markSessionUsed,
  isSessionUsed,
  pruneSessions,
  sanitizeName,
  sanitizePhone,
  sanitizeContact,
  SESSION_TTL_MS,
  MAX_DISTANCE_PER_SEC,
  MAX_SCORE_PER_SEC,
  MAX_COLLECTIBLES_PER_SEC,
  MAX_COMBO,
  MAX_ENTRIES,
};
