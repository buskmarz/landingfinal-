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

const MAX_EVENT_ENTRIES = Number.parseInt(process.env.CATERING_MAX_ENTRIES || "2000", 10);
const MAX_DETAILS_LEN = Number.parseInt(process.env.CATERING_MAX_DETAILS || "600", 10);
const configuredMaxGuests = Number.parseInt(process.env.CATERING_MAX_GUESTS || "20", 10);
const MAX_GUESTS = Number.isFinite(configuredMaxGuests) ? Math.min(configuredMaxGuests, 20) : 20;
const VALID_SETUPS = new Set(["espresso", "precoladora", "unsure"]);
const VALID_CONTACTS = new Set(["whatsapp", "email"]);

const sanitizeText = (input, maxLen) => {
  const text = String(input || "").trim().replace(/\s+/g, " ");
  return text.replace(/[<>]/g, "").slice(0, maxLen);
};

const isValidDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};
const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};
const mexicoDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });
  return `${map.year}-${map.month}-${map.day}`;
};
const createFolio = () => `BM-EVT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  }

  let body = null;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_error) {
    return json(400, { error: "Solicitud inválida." });
  }

  if (String(body.website || "").trim()) {
    return json(200, { ok: true, folio: "BM-EVT-RECIBIDA" });
  }

  const name = sanitizeName(body.name, 60);
  const phone = sanitizeContact(body.phone, 24);
  const email = sanitizeContact(body.email, 120).toLowerCase();
  const preferredContact = String(body.preferredContact || "whatsapp");
  const date = String(body.date || "").trim();
  const time = sanitizeText(body.time || "", 5);
  const guests = Number.parseInt(body.guests || "0", 10);
  const setup = String(body.setup || "").trim();
  const venue = sanitizeText(body.venue || "", 100);
  const details = sanitizeText(body.details || "", MAX_DETAILS_LEN);
  const source = sanitizeText(body.source || "eventos-page", 50);

  if (!name) return json(400, { error: "Escribe tu nombre." });
  if (!date || !isValidDate(date) || date < mexicoDateKey()) return json(400, { error: "Elige una fecha válida." });
  if (!time || !isValidTime(time)) return json(400, { error: "Elige una hora aproximada." });
  if (!Number.isFinite(guests) || guests < 1 || guests > MAX_GUESTS) return json(400, { error: "El evento admite de 1 a 20 personas." });
  if (!VALID_SETUPS.has(setup)) return json(400, { error: "Elige un tipo de servicio." });
  if (!venue) return json(400, { error: "Escribe el lugar o colonia." });
  if (!VALID_CONTACTS.has(preferredContact)) return json(400, { error: "Elige cómo responderte." });
  if (preferredContact === "whatsapp" && !isValidPhone(phone)) return json(400, { error: "Escribe un WhatsApp válido." });
  if (preferredContact === "email" && !isValidEmail(email)) return json(400, { error: "Escribe un correo válido." });
  if (phone && !isValidPhone(phone)) return json(400, { error: "Escribe un WhatsApp válido." });
  if (email && !isValidEmail(email)) return json(400, { error: "Escribe un correo válido." });
  if (body.privacyAccepted !== true) return json(400, { error: "Acepta el aviso de privacidad." });

  const now = Date.now();
  const ip = getClientIp(event);
  const ua = getUserAgent(event);
  const fingerprint = hashValue(`${ip}|${ua}`);
  const contactForLimit = (preferredContact === "email" ? email : phone) || email || phone;

  let state = null;
  try {
    state = await loadState(event);
  } catch (error) {
    console.error("[catering] storage error", error);
    return json(500, { error: "No pudimos guardar la solicitud. Intenta de nuevo." });
  }

  const rateResult = applyRateLimit(state, `catering:fp:${fingerprint}`, now);
  if (!rateResult.ok) {
    return json(429, { error: "Espera un momento antes de intentarlo de nuevo." }, { "Retry-After": String(rateResult.retryAfter) });
  }
  const contactLimit = applyRateLimit(state, `catering:contact:${hashValue(contactForLimit.toLowerCase())}`, now);
  if (!contactLimit.ok) {
    return json(429, { error: "Espera un momento antes de intentarlo de nuevo." }, { "Retry-After": String(contactLimit.retryAfter) });
  }

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
    folio: createFolio(),
    status: "new",
    name,
    phone,
    email,
    preferredContact,
    date,
    time,
    guests,
    setup,
    venue,
    details,
    source,
    createdAt: now,
  };

  state.eventRequests = Array.isArray(state.eventRequests) ? state.eventRequests : [];
  state.eventRequests.push(entry);
  state.cateringRequests = Array.isArray(state.cateringRequests) ? state.cateringRequests : [];
  state.cateringRequests.push({ ...entry, contact: preferredContact === "email" ? email : phone });

  ["eventRequests", "cateringRequests"].forEach((key) => {
    if (MAX_EVENT_ENTRIES > 0 && state[key].length > MAX_EVENT_ENTRIES) {
      state[key].sort((a, b) => b.createdAt - a.createdAt);
      state[key] = state[key].slice(0, MAX_EVENT_ENTRIES);
    }
  });

  try {
    await saveState(state);
  } catch (error) {
    console.error("[catering] save error", error);
    return json(500, { error: "No pudimos guardar la solicitud. Intenta de nuevo." });
  }

  return json(200, { ok: true, folio: entry.folio, requestId: entry.folio, createdAt: entry.createdAt });
};
