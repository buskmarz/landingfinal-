const { json, loadState, saveState, hashValue, getClientIp, getUserAgent } = require("./_shared");

const VISIT_TTL_MS = 6 * 60 * 60 * 1000;
const VISIT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const VISIT_TZ = process.env.DROPPY_WEEK_TZ || "America/Mexico_City";

function getDateKey(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: VISIT_TZ,
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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  }

  const now = Date.now();
  const ip = getClientIp(event);
  const ua = getUserAgent(event);
  const fingerprint = hashValue(`${ip}|${ua}`) || "anonymous";

  let state = null;
  try {
    state = await loadState(event);
  } catch (err) {
    return json(500, { error: "Storage no disponible." });
  }

  if (!state.visitStats) {
    state.visitStats = { total: 0, byDay: {}, lastByFp: {} };
  }

  const lastByFp = state.visitStats.lastByFp || {};
  Object.keys(lastByFp).forEach((key) => {
    if (now - lastByFp[key] > VISIT_MAX_AGE_MS) delete lastByFp[key];
  });

  const lastSeen = lastByFp[fingerprint] || 0;
  if (now - lastSeen < VISIT_TTL_MS) {
    return json(200, { ok: true, counted: false });
  }

  lastByFp[fingerprint] = now;
  state.visitStats.lastByFp = lastByFp;
  state.visitStats.total = Number(state.visitStats.total || 0) + 1;

  const dayKey = getDateKey(new Date(now));
  state.visitStats.byDay = state.visitStats.byDay || {};
  state.visitStats.byDay[dayKey] = Number(state.visitStats.byDay[dayKey] || 0) + 1;

  await saveState(state);

  return json(200, { ok: true, counted: true });
};
