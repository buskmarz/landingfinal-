const { getJSON, getMatches, json, listJSON, normalizeFolio } = require("./quiniela-shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const folioCode = normalizeFolio(event.queryStringParameters?.folio);
  const phaseId = String(event.queryStringParameters?.phaseId || "").trim();
  if (!/^BM26-\d{6}$/.test(folioCode)) return json(400, { error: "Folio inválido" });

  const folio = await getJSON("folios", `folios/${folioCode}.json`);
  if (!folio || folio.status !== "active") return json(403, { error: "Para consultar marcadores necesitas un folio activo." });

  const matches = await getMatches();
  const allowedIds = new Set(matches.filter((match) => !phaseId || match.phase === phaseId).map((match) => match.id));
  const predictions = (await listJSON("predictions", `predictions/${folioCode}/`)).filter((prediction) => allowedIds.has(prediction.matchId));

  return json(200, { predictions });
};
