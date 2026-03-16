const PORTAL_BASE = (process.env.TAREASCONTROL_LOYALTY_PORTAL_BASE || "https://tareascontrol.netlify.app/api/loyalty-portal").trim();

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "https://bmoodcoffee.com",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
  };
}

function readToken(event) {
  const authHeader = String(event.headers.authorization || event.headers.Authorization || "").trim();
  if (authHeader.toLowerCase().startsWith("bearer ")) return authHeader.slice(7).trim();
  return String(event.queryStringParameters?.token || "").trim();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: json(204, {}).headers, body: "" };
  }

  try {
    if (event.httpMethod === "POST") {
      const upstream = await fetch(PORTAL_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body || "{}",
      });
      const payload = await upstream.json().catch(() => ({}));
      return json(upstream.status, payload);
    }

    if (event.httpMethod === "GET") {
      const token = readToken(event);
      if (!token) return json(400, { error: "Token requerido." });
      const upstream = await fetch(`${PORTAL_BASE}?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = await upstream.json().catch(() => ({}));
      return json(upstream.status, payload);
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    return json(503, { error: "Consulta temporalmente no disponible." });
  }
};
