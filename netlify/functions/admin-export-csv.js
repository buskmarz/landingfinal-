const { json, listJSON, requireAdmin } = require("./quiniela-shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  if (!requireAdmin(event)) return json(401, { error: "Unauthorized" });

  const participants = await listJSON("participants", "participants/");
  const rows = [
    ["folioCode", "name", "phone", "email", "participationType", "status", "createdAt"],
    ...participants.map((participant) => [
      participant.folioCode,
      participant.name,
      participant.phone || participant.whatsapp,
      participant.email,
      participant.participationType,
      participant.status,
      participant.createdAt,
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="quiniela-better-mood-participantes.csv"',
      "Cache-Control": "no-store",
    },
    body: csv,
  };
};
