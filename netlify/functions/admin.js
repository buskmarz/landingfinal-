const { json, loadState, ensureCurrentWeek } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  }

  const adminToken = process.env.DROPPY_ADMIN_TOKEN;
  if (!adminToken) {
    return json(403, { error: "Admin token no configurado." });
  }

  const headers = event.headers || {};
  const headerToken = headers["x-admin-token"] || headers["X-Admin-Token"] || "";
  if (headerToken !== adminToken) {
    return json(401, { error: "No autorizado." });
  }

  let state = null;
  try {
    state = await loadState();
  } catch (err) {
    return json(500, { error: "Storage no disponible." });
  }
  state = ensureCurrentWeek(state);

  const limitRaw = event.queryStringParameters ? event.queryStringParameters.limit : null;
  const limit = Math.min(Math.max(Number.parseInt(limitRaw || "10", 10) || 10, 1), 50);

  state.entries = Array.isArray(state.entries) ? state.entries : [];
  state.entries.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);

  const entries = state.entries.slice(0, limit).map((entry) => ({
    name: entry.name,
    phone: entry.phone,
    score: entry.score,
    createdAt: entry.createdAt,
  }));

  return json(200, {
    weekStart: state.weekStart,
    entries,
  });
};
