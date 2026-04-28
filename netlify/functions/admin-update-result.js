const crypto = require("crypto");
const { getMatch, json, parseBody, requireAdmin, setJSON } = require("./quiniela-shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!requireAdmin(event)) return json(401, { error: "Unauthorized" });

  const body = parseBody(event);
  const matchId = String(body?.matchId || "").trim();
  const homeScoreResult = Number(body?.homeScoreResult);
  const awayScoreResult = Number(body?.awayScoreResult);
  if (!matchId || !Number.isInteger(homeScoreResult) || !Number.isInteger(awayScoreResult) || homeScoreResult < 0 || awayScoreResult < 0) {
    return json(400, { error: "Resultado inválido" });
  }

  const match = await getMatch(matchId);
  if (!match) return json(404, { error: "Partido no encontrado" });
  const now = new Date().toISOString();
  const updated = {
    ...match,
    status: "finished",
    homeScoreResult,
    awayScoreResult,
    winnerTeamId: homeScoreResult === awayScoreResult ? null : homeScoreResult > awayScoreResult ? "home" : "away",
    advancingTeamId: body?.advancingTeamId || null,
    updatedAt: now,
  };
  await setJSON("matches", `matches/${matchId}.json`, updated);
  await setJSON("admin_actions", `admin_actions/${Date.now()}-${crypto.randomUUID()}.json`, {
    action: "update_result",
    matchId,
    createdAt: now,
  });

  return json(200, { ok: true, match: updated });
};
