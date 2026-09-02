import {
  BRANCH_LABELS,
  RATING_KEYS,
  RATING_LABELS,
  feedbackStore,
  json,
  requestHasValidSession
} from "../lib/survey-shared.mjs";

const VALID_RANGES = new Set(["7", "30", "90", "all"]);
const VALID_BRANCHES = new Set(["all", "upaep", "cholula"]);

async function listResponseKeys(store) {
  const keys = [];
  for await (const page of store.list({ prefix: "responses/", paginate: true })) {
    page.blobs.forEach((blob) => keys.push(blob.key));
  }
  return keys;
}

async function loadRecords(store, keys) {
  const records = [];
  for (let index = 0; index < keys.length; index += 20) {
    const batch = await Promise.all(keys.slice(index, index + 20).map((key) => store.get(key, { type: "json" }).catch(() => null)));
    batch.forEach((record) => {
      if (record?.received_at && record?.ratings && RATING_KEYS.every((key) => Number.isInteger(record.ratings[key]))) records.push(record);
    });
  }
  return records;
}

function round(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(records, key) {
  if (!records.length) return null;
  return round(records.reduce((sum, record) => sum + Number(record.ratings[key]), 0) / records.length, 2);
}

function aggregate(records, key) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  records.forEach((record) => { distribution[record.ratings[key]] += 1; });
  return {
    key,
    label: RATING_LABELS[key],
    average: average(records, key),
    distribution
  };
}

function dayKey(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function recommendations(records, dimensions) {
  if (!records.length) return [{ level: "neutral", title: "Aún no hay respuestas", detail: "Comparte /encuesta/ en barra para crear la primera línea base." }];
  if (records.length < 5) return [{ level: "neutral", title: "Muestra inicial", detail: `Hay ${records.length} respuesta${records.length === 1 ? "" : "s"}. Espera al menos 5 antes de tomar una decisión operativa.` }];

  const actions = {
    service_overall: "Lee los comentarios y revisa el recorrido completo de llegada, pedido, entrega y despedida.",
    welcome: "Refuerza saludo, orientación inicial y una comprobación breve durante la visita.",
    speed: "Revisa la cola, el reparto de tareas y el tiempo entre orden y entrega en los turnos señalados.",
    accuracy: "Confirma el pedido antes de prepararlo y aplica una revisión final antes de entregarlo.",
    return_intent: "Busca la fricción dominante y cierra el ciclo con una mejora visible para la siguiente visita."
  };
  const ranked = [...dimensions].filter((item) => item.average !== null).sort((a, b) => a.average - b.average);
  const lowest = ranked[0];
  const result = [{
    level: lowest.average < 3.5 ? "critical" : lowest.average < 4.2 ? "watch" : "good",
    title: `Prioridad: ${lowest.label}`,
    detail: `${lowest.average.toFixed(1)}/5. ${actions[lowest.key]}`
  }];
  const critical = records.filter((record) => RATING_KEYS.some((key) => record.ratings[key] <= 2)).length;
  if (critical) result.push({ level: "critical", title: `${critical} experiencia${critical === 1 ? "" : "s"} por revisar`, detail: "Filtra por sucursal y consulta los comentarios recientes para detectar el momento del servicio." });
  return result;
}

function buildReport(records, filters) {
  const dimensions = RATING_KEYS.map((key) => aggregate(records, key));
  const overallPositive = records.filter((record) => record.ratings.service_overall >= 4).length;
  const critical = records.filter((record) => RATING_KEYS.some((key) => record.ratings[key] <= 2)).length;
  const days = new Map();
  records.forEach((record) => {
    const key = dayKey(record.received_at);
    const item = days.get(key) || { date: key, count: 0, total: 0 };
    item.count += 1;
    item.total += Number(record.ratings.service_overall);
    days.set(key, item);
  });
  const trend = [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({ date: item.date, responses: item.count, service_average: round(item.total / item.count, 2) }));
  const branches = Object.keys(BRANCH_LABELS).map((branch) => {
    const branchRecords = records.filter((record) => record.branch === branch);
    return {
      branch,
      label: BRANCH_LABELS[branch],
      responses: branchRecords.length,
      service_average: average(branchRecords, "service_overall"),
      welcome_average: average(branchRecords, "welcome"),
      speed_average: average(branchRecords, "speed"),
      accuracy_average: average(branchRecords, "accuracy"),
      return_average: average(branchRecords, "return_intent")
    };
  });
  const comments = records.filter((record) => record.comment).sort((a, b) => String(b.received_at).localeCompare(String(a.received_at))).slice(0, 30).map((record) => ({
    id: record.submission_id,
    branch: record.branch,
    branch_label: BRANCH_LABELS[record.branch] || record.branch,
    received_at: record.received_at,
    received_at_local: record.received_at_local,
    service_overall: record.ratings.service_overall,
    average: Number(record.average),
    comment: record.comment
  }));

  return {
    generated_at: new Date().toISOString(),
    filters,
    source: { name: "better-mood-feedback", grain: "Una respuesta anónima por envío", freshness: records.length ? records.map((record) => record.received_at).sort().at(-1) : null },
    summary: {
      responses: records.length,
      csat_percent: records.length ? round((overallPositive / records.length) * 100, 1) : null,
      service_average: average(records, "service_overall"),
      return_average: average(records, "return_intent"),
      critical_responses: critical
    },
    dimensions,
    branches,
    trend,
    recommendations: recommendations(records, dimensions),
    comments
  };
}

export default async (request) => {
  if (request.method !== "GET") return json({ error: "Método no permitido." }, 405);
  if (!requestHasValidSession(request)) return json({ error: "Sesión requerida." }, 401);

  const url = new URL(request.url);
  const range = VALID_RANGES.has(url.searchParams.get("range")) ? url.searchParams.get("range") : "30";
  const branch = VALID_BRANCHES.has(url.searchParams.get("branch")) ? url.searchParams.get("branch") : "all";
  const cutoff = range === "all" ? null : Date.now() - Number(range) * 24 * 60 * 60 * 1000;

  try {
    const store = feedbackStore();
    const keys = await listResponseKeys(store);
    const loaded = await loadRecords(store, keys);
    const records = loaded.filter((record) => {
      const validDate = Number.isFinite(new Date(record.received_at).getTime());
      if (!validDate || (cutoff && new Date(record.received_at).getTime() < cutoff)) return false;
      return branch === "all" || record.branch === branch;
    });
    return json(buildReport(records, { range, branch }));
  } catch (error) {
    console.error("feedback_report_failed", { message: error.message });
    return json({ error: "No pudimos cargar las métricas." }, 503);
  }
};

export const config = {
  path: "/api/customer-feedback-report"
};
