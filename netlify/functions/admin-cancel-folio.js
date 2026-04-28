const crypto = require("crypto");
const { getJSON, json, normalizeFolio, parseBody, requireAdmin, setJSON } = require("./quiniela-shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!requireAdmin(event)) return json(401, { error: "Unauthorized" });

  const body = parseBody(event);
  const folioCode = normalizeFolio(body?.folioCode || body?.folio);
  if (!/^BM26-\d{6}$/.test(folioCode)) return json(400, { error: "Folio inválido" });

  const folio = await getJSON("folios", `folios/${folioCode}.json`);
  if (!folio) return json(404, { error: "Folio no encontrado" });
  const participant = await getJSON("participants", `participants/${folio.participantId}.json`);
  const now = new Date().toISOString();

  await setJSON("folios", `folios/${folioCode}.json`, { ...folio, status: "cancelled", cancelledAt: now, updatedAt: now });
  if (participant) await setJSON("participants", `participants/${participant.id}.json`, { ...participant, status: "cancelled", updatedAt: now });
  await setJSON("admin_actions", `admin_actions/${Date.now()}-${crypto.randomUUID()}.json`, {
    action: "cancel_folio",
    folioCode,
    createdAt: now,
  });

  return json(200, { ok: true, folioCode, status: "cancelled" });
};
