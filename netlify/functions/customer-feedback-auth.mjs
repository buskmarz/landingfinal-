import {
  adminAccessConfigured,
  clearSessionCookie,
  createSessionCookie,
  json,
  requestHasValidSession,
  validAdminPassword
} from "../lib/survey-shared.mjs";

export default async (request) => {
  if (!adminAccessConfigured()) return json({ error: "Acceso administrativo no configurado." }, 503);

  if (request.method === "GET") {
    return json({ authenticated: requestHasValidSession(request) });
  }

  if (request.method === "DELETE") {
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
  }

  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }

  if (!validAdminPassword(String(payload?.password || ""))) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return json({ error: "Clave incorrecta." }, 401);
  }

  return json({ ok: true }, 200, { "set-cookie": createSessionCookie() });
};

export const config = {
  path: "/api/customer-feedback-auth"
};
