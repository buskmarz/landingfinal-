const crypto = require("crypto");
const {
  checkRateLimit,
  generateFolioCode,
  json,
  parseBody,
  sanitizeText,
  setJSON,
} = require("./quiniela-shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const rate = await checkRateLimit("reserve-kit", event, 8, 60_000);
  if (!rate.allowed) return json(429, { error: "Demasiados intentos. Intenta de nuevo en un minuto." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "JSON inválido." });

  const name = sanitizeText(body.name);
  const phone = sanitizeText(body.whatsapp || body.phone, 40);
  const email = sanitizeText(body.email, 120).toLowerCase();
  const participationType = sanitizeText(body.participationType, 20);
  const acceptsTerms = Boolean(body.acceptsTerms);
  const acceptsPromos = Boolean(body.acceptsMarketing || body.acceptsPromos);
  const paymentMethod = body.paymentMethod === "in_store" ? "in_store" : "mercado_pago";
  const normalizedParticipationType = {
    fisico: "physical",
    ambos: "both",
    physical: "physical",
    both: "both",
    digital: "digital",
  }[participationType];

  if (name.length < 4) return json(400, { error: "Nombre obligatorio." });
  if (!/^\+?[0-9\s()-]{8,}$/.test(phone)) return json(400, { error: "WhatsApp inválido." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "Email inválido." });
  if (!normalizedParticipationType) return json(400, { error: "Método de participación inválido." });
  if (!acceptsTerms) return json(400, { error: "Debes aceptar términos." });

  const now = new Date().toISOString();
  const participantId = crypto.randomUUID();
  const folioId = crypto.randomUUID();
  const folioCode = await generateFolioCode();

  const participant = {
    id: participantId,
    folioCode,
    name,
    phone,
    whatsapp: phone,
    email,
    publicName: name.split(/\s+/).slice(0, 2).join(" "),
    participationType: normalizedParticipationType,
    acceptsTerms,
    acceptsPromos,
    acceptsMarketing: acceptsPromos,
    status: "pending_payment",
    createdAt: now,
    updatedAt: now,
  };

  const folio = {
    id: folioId,
    participantId,
    folioCode,
    status: "pending_payment",
    qrUrl: null,
    reservedAt: now,
    activatedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    setJSON("participants", `participants/${participantId}.json`, participant),
    setJSON("folios", `folios/${folioCode}.json`, folio),
  ]);

  return json(200, {
    participantId,
    folioCode,
    folioStatus: folio.status,
    nextStep: paymentMethod === "in_store" ? "pay_in_store" : "pay_online",
    message: paymentMethod === "in_store"
      ? "Paga tu Kit Better Mood Futbolero en barra. Nuestro equipo activará tu folio."
      : "Tu kit está reservado. Completa el pago de $99 MXN para activar tu folio automáticamente.",
  });
};
