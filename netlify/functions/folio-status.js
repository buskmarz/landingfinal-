const { getJSON, json, normalizeFolio } = require("./quiniela-shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const folioCode = normalizeFolio(event.queryStringParameters?.folio);
  if (!/^BM26-\d{6}$/.test(folioCode)) return json(400, { error: "Folio inválido" });

  const folio = await getJSON("folios", `folios/${folioCode}.json`);
  if (!folio) return json(404, { error: "No encontramos este folio." });

  const participant = folio.participantId ? await getJSON("participants", `participants/${folio.participantId}.json`) : null;
  const payment = folio.paymentId ? await getJSON("payments", `payments/${folio.paymentId}.json`) : null;

  return json(200, {
    folioCode,
    folioStatus: folio.status,
    status: folio.status,
    participantName: participant?.publicName || participant?.name || "",
    participantStatus: participant?.status || null,
    paymentStatus: payment?.status || null,
    canPredict: folio.status === "active" && participant?.status === "active",
    qrUrl: folio.qrUrl || null,
  });
};
