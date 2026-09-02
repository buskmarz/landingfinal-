import crypto from "node:crypto";
import {
  RATING_KEYS,
  RATING_LABELS,
  branchLabel,
  cleanText,
  escapeHtml,
  feedbackStore,
  getEnv,
  json,
  visitLabel
} from "../lib/survey-shared.mjs";

const ALLOWED_BRANCHES = new Set(["upaep", "cholula"]);
const ALLOWED_VISITS = new Set(["hoy", "ayer", "esta_semana"]);

function validSubmissionId(value) {
  const id = cleanText(value, 80);
  return /^[a-zA-Z0-9-]{12,80}$/.test(id) ? id : crypto.randomUUID();
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Respuesta inválida.";
  if (payload.company) return "bot";
  if (!ALLOWED_BRANCHES.has(payload.branch)) return "Elige una sucursal válida.";
  if (!ALLOWED_VISITS.has(payload.visit_when)) return "Elige cuándo fue tu visita.";
  if (!payload.ratings || typeof payload.ratings !== "object") return "Faltan las calificaciones.";
  for (const key of RATING_KEYS) {
    if (!Number.isInteger(payload.ratings[key]) || payload.ratings[key] < 1 || payload.ratings[key] > 5) {
      return "Responde las cinco preguntas.";
    }
  }
  const elapsed = Number(payload.elapsed_ms);
  if (!Number.isFinite(elapsed) || elapsed < 4000 || elapsed > 86400000) return "Tiempo de respuesta inválido.";
  if (String(payload.comment || "").length > 600) return "El comentario es demasiado largo.";
  return "";
}

function emailBody(record) {
  const rows = RATING_KEYS.map((key) => `<tr><td style="padding:9px 12px;border-bottom:1px solid #eee">${RATING_LABELS[key]}</td><td style="padding:9px 12px;border-bottom:1px solid #eee;font-weight:700">${record.ratings[key]} / 5</td></tr>`).join("");
  const comment = record.comment ? escapeHtml(record.comment) : "Sin comentario";
  return `<!doctype html><html><body style="margin:0;background:#f7f3e9;color:#231f20;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#ffde00;border-radius:24px;padding:24px"><p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.12em">BETTER MOOD · ENCUESTA</p><h1 style="margin:0;font-size:28px">Nueva respuesta de servicio</h1></div><div style="background:#fff;border-radius:24px;padding:24px;margin-top:16px"><p><strong>Sucursal:</strong> ${branchLabel(record.branch)}<br><strong>Visita:</strong> ${visitLabel(record.visit_when)}<br><strong>Promedio:</strong> ${record.average} / 5<br><strong>Recibida:</strong> ${escapeHtml(record.received_at_local)}</p><table style="width:100%;border-collapse:collapse;margin:20px 0">${rows}</table><p style="margin-bottom:6px"><strong>Comentario</strong></p><p style="margin-top:0;line-height:1.55">${comment}</p><p style="margin-top:24px;color:#777;font-size:12px">ID: ${escapeHtml(record.submission_id)}</p></div></div></body></html>`;
}

async function sendNotification(record) {
  const apiKey = getEnv("RESEND_API_KEY");
  const to = getEnv("SURVEY_NOTIFY_EMAIL");
  const from = getEnv("SURVEY_FROM_EMAIL");
  if (!apiKey || !to || !from) return { status: "not_configured" };

  const lowScore = RATING_KEYS.some((key) => record.ratings[key] <= 1) || record.ratings.service_overall <= 2;
  const prefix = lowScore ? "[Atención]" : record.average < 4 ? "[Revisar]" : "[Nueva respuesta]";
  const subject = `${prefix} Encuesta ${branchLabel(record.branch)} · ${record.average}/5`;
  const textLines = RATING_KEYS.map((key) => `${RATING_LABELS[key]}: ${record.ratings[key]}/5`);
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `bm-survey-${record.submission_id}`
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: emailBody(record),
      text: `Nueva encuesta Better Mood\nSucursal: ${branchLabel(record.branch)}\nVisita: ${visitLabel(record.visit_when)}\nPromedio: ${record.average}/5\n${textLines.join("\n")}\nComentario: ${record.comment || "Sin comentario"}\nID: ${record.submission_id}`
    })
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data.message || "Resend rechazó el correo");
  return { status: "sent", resend_id: data.id || "sent", sent_at: new Date().toISOString() };
}

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
  const body = await request.text();
  if (!body || body.length > 5000) return json({ error: "Respuesta demasiado grande." }, 413);

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const validation = validatePayload(payload);
  if (validation === "bot") return json({ ok: true });
  if (validation) return json({ error: validation }, 400);

  const now = new Date();
  const ratings = Object.fromEntries(RATING_KEYS.map((key) => [key, payload.ratings[key]]));
  const average = Number((RATING_KEYS.reduce((sum, key) => sum + ratings[key], 0) / RATING_KEYS.length).toFixed(2));
  const submissionId = validSubmissionId(payload.submission_id);
  const record = {
    schema_version: 2,
    submission_id: submissionId,
    branch: payload.branch,
    visit_when: payload.visit_when,
    ratings,
    average,
    comment: cleanText(payload.comment, 600),
    elapsed_ms: Math.round(Number(payload.elapsed_ms)),
    page: cleanText(payload.page, 120),
    received_at: now.toISOString(),
    received_at_local: new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" }).format(now),
    notification: { status: "pending" }
  };

  const key = `responses/${now.toISOString().slice(0, 7)}/${submissionId}.json`;
  let store;
  try {
    store = feedbackStore();
    await store.setJSON(key, record, { metadata: { branch: record.branch, average: record.average } });
  } catch (error) {
    console.error("feedback_storage_failed", { submission_id: submissionId, message: error.message });
    return json({ error: "No pudimos guardar tu respuesta. Intenta nuevamente." }, 503);
  }

  try {
    record.notification = await sendNotification(record);
  } catch (error) {
    record.notification = { status: "failed", failed_at: new Date().toISOString() };
    console.error("feedback_notification_failed", { submission_id: submissionId, message: error.message });
  }
  await store.setJSON(key, record, { metadata: { branch: record.branch, average: record.average } });

  return json({ ok: true, submission_id: submissionId, notification: record.notification.status });
};

export const config = {
  path: "/api/customer-feedback"
};
