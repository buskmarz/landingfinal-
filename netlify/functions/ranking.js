const {
  initNetlifyBlobs,
  calculateMatchPoints,
  getActiveFolios,
  getJSON,
  getMatches,
  json,
  listJSON,
  setJSON,
} = require("./football-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const phase = String(event.queryStringParameters?.phase || "general");
  const matches = await getMatches();
  const hasOfficialResults = matches.some((match) => (
    match.homeScoreResult !== null &&
    match.homeScoreResult !== undefined &&
    match.awayScoreResult !== null &&
    match.awayScoreResult !== undefined
  ));
  if (!hasOfficialResults) {
    const key = phase === "general" ? "ranking_cache/general.json" : `ranking_cache/${phase}.json`;
    await setJSON("ranking_cache", key, { phase, generatedAt: new Date().toISOString(), ranking: [] });
    return json(200, { phase, ranking: [] });
  }

  const matchesById = Object.fromEntries(matches.map((match) => [match.id, match]));
  const activeFolios = await getActiveFolios();
  const rows = [];

  for (const folio of activeFolios) {
    const participant = await getJSON("participants", `participants/${folio.participantId}.json`);
    const predictions = await listJSON("predictions", `predictions/${folio.folioCode}/`);
    const phasePoints = {};
    let totalPoints = 0;
    let exactScores = 0;
    const completedPhaseIds = new Set();
    let earliestPredictionAt = null;

    for (const prediction of predictions) {
      const match = matchesById[prediction.matchId];
      if (!match) continue;
      const score = calculateMatchPoints(prediction, match);
      if (score) {
        totalPoints += score.points;
        phasePoints[prediction.phaseId] = (phasePoints[prediction.phaseId] || 0) + score.points;
        if (score.exact) exactScores += 1;
      }
      if (prediction.createdAt && (!earliestPredictionAt || new Date(prediction.createdAt) < new Date(earliestPredictionAt))) {
        earliestPredictionAt = prediction.createdAt;
      }
    }

    const phaseTotals = matches.reduce((acc, match) => {
      acc[match.phase] = (acc[match.phase] || 0) + 1;
      return acc;
    }, {});
    const predictionPhaseCounts = predictions.reduce((acc, prediction) => {
      acc[prediction.phaseId] = (acc[prediction.phaseId] || 0) + 1;
      return acc;
    }, {});
    Object.entries(predictionPhaseCounts).forEach(([phaseId, count]) => {
      if (phaseTotals[phaseId] && count >= phaseTotals[phaseId]) completedPhaseIds.add(phaseId);
    });

    rows.push({
      participantFolio: folio.folioCode,
      folioCode: folio.folioCode,
      name: participant?.publicName || participant?.name || "Participante",
      totalPoints,
      exactScores,
      completedPhasesCount: completedPhaseIds.size,
      phasePoints,
      createdAt: folio.activatedAt || folio.reservedAt,
      earliestPredictionAt,
    });
  }

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    if (b.completedPhasesCount !== a.completedPhasesCount) return b.completedPhasesCount - a.completedPhasesCount;
    return new Date(a.earliestPredictionAt || a.createdAt || 0) - new Date(b.earliestPredictionAt || b.createdAt || 0);
  });

  const ranked = rows.map((entry, index) => ({ ...entry, rankingPosition: index + 1 }));
  const key = phase === "general" ? "ranking_cache/general.json" : `ranking_cache/${phase}.json`;
  await setJSON("ranking_cache", key, { phase, generatedAt: new Date().toISOString(), ranking: ranked });

  return json(200, { phase, ranking: ranked });
};
