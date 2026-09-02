const { json, loadState, saveState } = require("./_shared");

const TRACK_TZ = process.env.DROPPY_WEEK_TZ || "America/Mexico_City";
const MAX_RECENT_EVENTS = 80;

function getDateKey(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TRACK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });
  return `${map.year}-${map.month}-${map.day}`;
}

function cleanText(value, fallback, maxLength = 120) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/[^\w:/.#?&=%-]/g, "-").replace(/-+/g, "-");
  return cleaned.slice(0, maxLength) || fallback;
}

function cleanHref(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, "https://bmoodcoffee.com");
    return `${url.origin}${url.pathname}`.slice(0, 180);
  } catch (err) {
    return cleanText(value, "", 120);
  }
}

function cleanMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = {
    session_id: 80,
    lead_id: 80,
    lead_tier: 8,
    business_type: 40,
    consumption_range: 40,
    utm_source: 80,
    utm_medium: 80,
    utm_campaign: 100,
    referrer_host: 120,
  };
  return Object.entries(allowed).reduce((result, [key, maxLength]) => {
    const cleaned = cleanText(value[key], "", maxLength);
    if (cleaned) result[key] = cleaned;
    return result;
  }, {});
}

function increment(map, key) {
  if (!key) return;
  map[key] = Number(map[key] || 0) + 1;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return json(400, { error: "JSON invalido." });
  }

  const eventName = cleanText(payload.event, "unknown", 64);
  const cta = cleanText(payload.cta, "unknown", 80);
  const path = cleanText(payload.path, "/", 120);
  const href = cleanHref(payload.href);
  const meta = cleanMeta(payload.meta);
  const now = new Date();
  const dayKey = getDateKey(now);

  let state = null;
  try {
    state = await loadState(event);
  } catch (err) {
    return json(500, { error: "Storage no disponible." });
  }

  if (!state.conversionStats) {
    state.conversionStats = {
      total: 0,
      byDay: {},
      byEvent: {},
      byCta: {},
      byPath: {},
      byLeadTier: {},
      byBusinessType: {},
      byUtmSource: {},
      recent: [],
    };
  }

  const stats = state.conversionStats;
  stats.total = Number(stats.total || 0) + 1;
  stats.byDay = stats.byDay || {};
  stats.byEvent = stats.byEvent || {};
  stats.byCta = stats.byCta || {};
  stats.byPath = stats.byPath || {};
  stats.byLeadTier = stats.byLeadTier || {};
  stats.byBusinessType = stats.byBusinessType || {};
  stats.byUtmSource = stats.byUtmSource || {};
  stats.recent = Array.isArray(stats.recent) ? stats.recent : [];

  increment(stats.byDay, dayKey);
  increment(stats.byEvent, eventName);
  increment(stats.byCta, cta);
  increment(stats.byPath, path);
  increment(stats.byLeadTier, meta.lead_tier);
  increment(stats.byBusinessType, meta.business_type);
  increment(stats.byUtmSource, meta.utm_source);

  stats.recent.unshift({
    ts: now.toISOString(),
    event: eventName,
    cta,
    path,
    href,
    meta,
  });
  stats.recent = stats.recent.slice(0, MAX_RECENT_EVENTS);

  await saveState(state);

  return json(200, { ok: true });
};
