const { json, loadState, ensureCurrentWeek } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  }

  const entryId = event.queryStringParameters ? event.queryStringParameters.entryId : null;
  let state = null;
  try {
    state = await loadState();
  } catch (err) {
    return json(500, { error: "Storage no disponible. Reintenta más tarde." });
  }
  state = ensureCurrentWeek(state);

  state.entries = Array.isArray(state.entries) ? state.entries : [];
  state.entries.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);

  const top = state.entries.slice(0, 10).map((entry) => ({
    name: entry.name,
    score: entry.score,
  }));

  let userRank = null;
  if (entryId) {
    const idx = state.entries.findIndex((entry) => entry.id === entryId);
    if (idx >= 0) userRank = idx + 1;
  }

  return json(200, {
    weekStart: state.weekStart,
    entries: top,
    userRank,
  });
};
