const crypto = require("crypto");
const {
  json,
  loadState,
  saveState,
  sanitizeName,
  sanitizeContact,
  getClientIp,
  getUserAgent,
  hashValue,
  applyRateLimit,
} = require("./_shared");

const MAX_CATERING_ENTRIES = Number.parseInt(process.env.CATERING_MAX_ENTRIES || "2000", 10);
const MAX_DETAILS_LEN = Number.parseInt(process.env.CATERING_MAX_DETAILS || "600", 10);
const MAX_GUESTS = Number.parseInt(process.env.CATERING_MAX_GUESTS || "1000", 10);

const sanitizeDetails = (input, maxLen) => {
  const text = String(input || "").trim().replace(/\s+/g, " ");
  const safe = text.replace(/[<>]/g, "");
  return safe.slice(0, maxLen);
};

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  }

  let body = null;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: "JSON invalido." });
  }

  const name = sanitizeName(body.name, 60);
  const contact = sanitizeContact(body.contact || body.phone, 60);
  const date = String(body.date || "").trim();
  const guests = Number.parseInt(body.guests || "0", 10);
  const details = sanitizeDetails(body.details || "", MAX_DETAILS_LEN);

  if (!name) return json(400, { error: "Nombre requerido." });
  if (!contact) return json(400, { error: "Email o telefono requerido." });
  if (!date || !isValidDate(date)) return json(400, { error: "Fecha invalida." });
  if (!Number.isFinite(guests) || guests < 1 || guests > MAX_GUESTS) {
    return json(400, { error: "Numero de invitados invalido." });
  }

  const now = Date.now();
  const ip = getClientIp(event);
  const ua = getUserAgent(event);
  const fingerprint = hashValue(`${ip}|${ua}`);

  let state = null;
  try {
    state = await loadState(event);
  } catch (err) {
    console.error("[catering] storage error", err);
    return json(500, { error: "Storage no disponible. Reintenta mas tarde." });
  }

  const rateKey = `catering:fp:${fingerprint}`;
  const rateResult = applyRateLimit(state, rateKey, now);
  if (!rateResult.ok) {
    return json(
      429,
      { error: "Demasiados intentos. Espera un poco.", retryAfter: rateResult.retryAfter },
      { "Retry-After": String(rateResult.retryAfter) }
    );
  }

  const contactKey = `catering:contact:${hashValue(contact.toLowerCase())}`;
  const contactLimit = applyRateLimit(state, contactKey, now);
  if (!contactLimit.ok) {
    return json(
      429,
      { error: "Demasiados intentos para este contacto.", retryAfter: contactLimit.retryAfter },
      { "Retry-After": String(contactLimit.retryAfter) }
    );
  }

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
    name,
    contact,
    date,
    guests,
    details,
    createdAt: now,
  };

  state.cateringRequests = Array.isArray(state.cateringRequests) ? state.cateringRequests : [];
  state.cateringRequests.push(entry);

  if (MAX_CATERING_ENTRIES > 0 && state.cateringRequests.length > MAX_CATERING_ENTRIES) {
    state.cateringRequests.sort((a, b) => b.createdAt - a.createdAt);
    state.cateringRequests = state.cateringRequests.slice(0, MAX_CATERING_ENTRIES);
  }

  await saveState(state);

  return json(200, {
    ok: true,
    requestId: entry.id,
    createdAt: entry.createdAt,
  });
};
