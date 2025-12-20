const crypto = require("crypto");
const {
  json,
  verifyToken,
  hashValue,
  getClientIp,
  getUserAgent,
  loadState,
  saveState,
  ensureCurrentWeek,
  applyRateLimit,
  markSessionUsed,
  isSessionUsed,
  pruneSessions,
  sanitizeName,
  sanitizePhone,
  MAX_DISTANCE_PER_SEC,
  MAX_SCORE_PER_SEC,
  MAX_COLLECTIBLES_PER_SEC,
  MAX_COMBO,
  MAX_ENTRIES,
} = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  }

  let body = null;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: "JSON inválido." });
  }

  const token = String(body.token || "");
  if (!token) return json(400, { error: "Token requerido." });

  const session = verifyToken(token);
  if (!session) return json(401, { error: "Sesión inválida o expirada." });

  const ip = getClientIp(event);
  const ua = getUserAgent(event);
  const fingerprint = hashValue(`${ip}|${ua}`);
  if (session.fp && session.fp !== fingerprint) {
    return json(403, { error: "Sesión no coincide con el dispositivo." });
  }

  const now = Date.now();
  const durationMs = Number.parseInt(body.durationMs || "0", 10);
  const durationSec = durationMs / 1000;

  const distance = Number.parseInt(body.distance || "0", 10);
  const collectibles = Number.parseInt(body.collectibles || "0", 10);
  const maxCombo = Number.parseInt(body.maxCombo || "1", 10);
  const score = Number.parseInt(body.score || "0", 10);

  const name = sanitizeName(body.name, 24);
  const phone = sanitizePhone(body.phone, 18);

  if (!name) return json(400, { error: "Nombre requerido." });
  if (!Number.isFinite(durationSec) || durationSec < 1 || durationSec > 600) {
    return json(400, { error: "Duración inválida." });
  }
  if (distance < 0 || distance > durationSec * MAX_DISTANCE_PER_SEC + 50) {
    return json(400, { error: "Distancia inválida." });
  }
  if (collectibles < 0 || collectibles > durationSec * MAX_COLLECTIBLES_PER_SEC + 5) {
    return json(400, { error: "Coleccionables inválidos." });
  }
  if (maxCombo < 1 || maxCombo > MAX_COMBO) {
    return json(400, { error: "Combo inválido." });
  }
  if (score < 0 || score > durationSec * MAX_SCORE_PER_SEC + 200) {
    return json(400, { error: "Puntaje fuera de rango." });
  }

  const maxByComponents = Math.floor(distance) + collectibles * maxCombo + 200;
  if (score > maxByComponents) {
    return json(400, { error: "Puntaje no consistente." });
  }

  let state = null;
  try {
    state = await loadState();
  } catch (err) {
    console.error("[droppy] storage error", err);
    return json(500, { error: "Storage no disponible. Reintenta más tarde." });
  }
  state = ensureCurrentWeek(state);
  pruneSessions(state, now);

  if (isSessionUsed(state, session.sid)) {
    return json(409, { error: "Esta sesión ya fue enviada." });
  }

  const rateKey = `fp:${fingerprint}`;
  const rateResult = applyRateLimit(state, rateKey, now);
  if (!rateResult.ok) {
    return json(
      429,
      { error: "Demasiados intentos. Espera un poco.", retryAfter: rateResult.retryAfter },
      { "Retry-After": String(rateResult.retryAfter) }
    );
  }

  if (phone) {
    const phoneKey = `phone:${hashValue(phone)}`;
    const phoneLimit = applyRateLimit(state, phoneKey, now);
    if (!phoneLimit.ok) {
      return json(
        429,
        { error: "Demasiados intentos para este teléfono.", retryAfter: phoneLimit.retryAfter },
        { "Retry-After": String(phoneLimit.retryAfter) }
      );
    }
  } else if (name.startsWith("@")) {
    const handleKey = `ig:${hashValue(name.toLowerCase())}`;
    const handleLimit = applyRateLimit(state, handleKey, now);
    if (!handleLimit.ok) {
      return json(
        429,
        { error: "Demasiados intentos para este usuario.", retryAfter: handleLimit.retryAfter },
        { "Retry-After": String(handleLimit.retryAfter) }
      );
    }
  }

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
    name,
    phone: phone || null,
    score,
    distance,
    collectibles,
    maxCombo,
    durationMs,
    createdAt: now,
  };

  state.entries = Array.isArray(state.entries) ? state.entries : [];
  state.entries.push(entry);
  state.entries.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);

  if (state.entries.length > MAX_ENTRIES) {
    state.entries = state.entries.slice(0, MAX_ENTRIES);
  }

  markSessionUsed(state, session.sid, now);

  await saveState(state);

  const rank = state.entries.findIndex((item) => item.id === entry.id) + 1;

  return json(200, {
    ok: true,
    entryId: entry.id,
    rank: rank > 0 ? rank : null,
    weekStart: state.weekStart,
  });
};
