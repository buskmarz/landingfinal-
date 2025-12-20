const { json, loadState, getPeriodMeta } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  }

  const entryId = event.queryStringParameters ? event.queryStringParameters.entryId : null;
  const periodParam = event.queryStringParameters ? event.queryStringParameters.period : null;
  const period = ["weekly", "monthly", "all"].includes(periodParam) ? periodParam : "weekly";
  let state = null;
  try {
    state = await loadState(event);
  } catch (err) {
    console.error("[droppy] storage error", err);
    return json(500, { error: "Storage no disponible. Reintenta más tarde." });
  }
  const { startMs, label } = getPeriodMeta(period);
  state.entries = Array.isArray(state.entries) ? state.entries : [];

  const filtered = period === "all" ? state.entries : state.entries.filter((entry) => entry.createdAt >= startMs);
  filtered.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);

  const top = filtered.slice(0, 10).map((entry) => ({
    name: entry.name,
    score: entry.score,
  }));

  let userRank = null;
  if (entryId) {
    const idx = filtered.findIndex((entry) => entry.id === entryId);
    if (idx >= 0) userRank = idx + 1;
  }

  return json(200, {
    period,
    periodStart: label,
    entries: top,
    userRank,
  });
};
