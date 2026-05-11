const {
  initNetlifyBlobs,
  getJSON,
  getMatches,
  getMatch,
  checkRateLimit,
  json,
  normalizeFolio,
  parseBody,
  setJSON,
} = require("./football-shared");
const crypto = require("crypto");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const rate = await checkRateLimit("save-predictions", event, 30, 60_000);
  if (!rate.allowed) return json(429, { error: "Demasiados intentos. Intenta de nuevo en un minuto." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "JSON inválido" });

  const folioCode = normalizeFolio(body.folioCode || body.folio);
  const phaseId = String(body.phaseId || "").trim();
  const predictions = Array.isArray(body.predictions) ? body.predictions : [];

  if (!/^BM26-\d{6}$/.test(folioCode)) return json(400, { error: "Folio inválido" });
  if (!phaseId) return json(400, { error: "Fase inválida" });
  if (!predictions.length) return json(400, { error: "No hay predicciones para guardar" });

  const folio = await getJSON("folios", `folios/${folioCode}.json`);
  if (!folio) return json(404, { error: "No encontramos este folio. Revisa el código o crea tu kit." });
  if (folio.status !== "active") {
    return json(403, { error: "Tu folio aún no está activo. Completa tu pago para guardar tus marcadores." });
  }

  const now = new Date().toISOString();
  const saved = [];
  const blocked = [];

  for (const item of predictions) {
    const matchId = String(item.matchId || "").trim();
    const match = await getMatch(matchId);
    if (!match || match.phase !== phaseId) return json(400, { error: `Partido inválido: ${matchId}` });

    const locked = isLocked(match);
    if (locked) {
      blocked.push(matchId);
      continue;
    }

    const homeScorePrediction = Number(item.homeScorePrediction ?? item.predictedHomeScore);
    const awayScorePrediction = Number(item.awayScorePrediction ?? item.predictedAwayScore);
    if (!Number.isInteger(homeScorePrediction) || !Number.isInteger(awayScorePrediction) || homeScorePrediction < 0 || awayScorePrediction < 0) {
      return json(400, { error: "Los marcadores deben ser enteros iguales o mayores a 0." });
    }

    const previous = await getJSON("predictions", `predictions/${folioCode}/${matchId}.json`);
    const prediction = {
      id: previous?.id || crypto.randomUUID(),
      folio: folioCode,
      participantId: folio.participantId,
      matchId,
      phaseId,
      homeScorePrediction,
      awayScorePrediction,
      advancingTeamId: item.advancingTeamId || null,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
      lockedAt: null,
    };
    await setJSON("predictions", `predictions/${folioCode}/${matchId}.json`, prediction);
    saved.push(prediction);
  }

  const allPhaseMatches = (await getMatches()).filter((match) => match.phase === phaseId);

  return json(200, {
    savedCount: saved.length,
    blockedMatches: blocked,
    phaseProgress: `${saved.length}/${allPhaseMatches.length}`,
    phaseProgressDetail: {
      saved: saved.length,
      total: allPhaseMatches.length,
    },
  });
};

function isLocked(match) {
  if (["locked", "finished", "cerrada", "finalizado"].includes(match.status)) return true;
  return new Date(match.matchDate || match.dateTime).getTime() <= Date.now();
}
