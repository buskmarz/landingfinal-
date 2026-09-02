import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

export const STORE_NAME = "better-mood-feedback";
export const RATING_KEYS = ["service_overall", "welcome", "speed", "accuracy", "return_intent"];
export const RATING_LABELS = {
  service_overall: "Servicio general",
  welcome: "Bienvenida y atención",
  speed: "Agilidad",
  accuracy: "Pedido como se esperaba",
  return_intent: "Intención de regresar"
};
export const BRANCH_LABELS = {
  upaep: "UPAEP / La Paz",
  cholula: "Cholula"
};

export function getEnv(name) {
  return globalThis.Netlify?.env?.get(name) || process.env[name] || "";
}

export function feedbackStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

export function cleanText(value, maximum) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function configuredAdminSecret() {
  return getEnv("SURVEY_DASHBOARD_PASSWORD") || getEnv("ADMIN_SECRET") || getEnv("ADMIN_PASSWORD");
}

function signingSecret() {
  return getEnv("SURVEY_DASHBOARD_SECRET") || getEnv("ADMIN_SECRET") || getEnv("ADMIN_PASSWORD");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(value) {
  return crypto.createHmac("sha256", signingSecret()).update(value).digest("base64url");
}

export function adminAccessConfigured() {
  return Boolean(configuredAdminSecret() && signingSecret());
}

export function validAdminPassword(value) {
  const expected = configuredAdminSecret();
  return Boolean(expected && safeEqual(value, expected));
}

export function createSessionCookie() {
  const payload = Buffer.from(JSON.stringify({
    scope: "customer-feedback-report",
    exp: Date.now() + 8 * 60 * 60 * 1000
  })).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  return `bm_survey_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
}

export function clearSessionCookie() {
  return "bm_survey_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

export function requestHasValidSession(request) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie.split(/;\s*/).find((part) => part.startsWith("bm_survey_session="))?.slice("bm_survey_session=".length);
  if (!token || !signingSecret()) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.scope === "customer-feedback-report" && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

export function branchLabel(branch) {
  return BRANCH_LABELS[branch] || branch;
}

export function visitLabel(visit) {
  return { hoy: "Hoy", ayer: "Ayer", esta_semana: "Esta semana" }[visit] || visit;
}
