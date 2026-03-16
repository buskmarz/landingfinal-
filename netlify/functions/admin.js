const { json, loadState, getPeriodMeta } = require("./_shared");

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
    state = await loadState(event);
  } catch (err) {
    return json(500, { error: "Storage no disponible." });
  }

  const periodParam = event.queryStringParameters ? event.queryStringParameters.period : null;
  const period = ["weekly", "monthly", "all"].includes(periodParam) ? periodParam : "all";
  const { startMs, label } = getPeriodMeta(period);

  const limitRaw = event.queryStringParameters ? event.queryStringParameters.limit : null;
  const limit = Math.min(Math.max(Number.parseInt(limitRaw || "10", 10) || 10, 1), 50);

  state.entries = Array.isArray(state.entries) ? state.entries : [];
  const filtered = period === "all" ? state.entries : state.entries.filter((entry) => entry.createdAt >= startMs);
  filtered.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);

  const entries = filtered.slice(0, limit).map((entry) => ({
    name: entry.name,
    contact: entry.contact || entry.phone || null,
    phone: entry.phone || null,
    score: entry.score,
    createdAt: entry.createdAt,
  }));

  return json(200, {
    period,
    periodStart: label,
    entries,
  });
};
