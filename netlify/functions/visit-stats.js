const { json, loadState } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  }

  const token = event.queryStringParameters ? event.queryStringParameters.token : "";
  const expected = process.env.VISIT_STATS_TOKEN;
  if (!expected || token !== expected) {
    return json(401, { error: "No autorizado." });
  }

  let state = null;
  try {
    state = await loadState(event);
  } catch (err) {
    return json(500, { error: "Storage no disponible." });
  }

  const visitStats = state.visitStats || { total: 0, byDay: {} };
  return json(200, { ok: true, visitStats });
};
