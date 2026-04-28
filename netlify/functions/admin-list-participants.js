const {
  initNetlifyBlobs, json, listJSON, requireAdmin } = require("./quiniela-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (!requireAdmin(event)) return json(401, { error: "Unauthorized" });
  const query = String(event.queryStringParameters?.q || "").toLowerCase();
  const participants = await listJSON("participants", "participants/");
  const filtered = participants.filter((participant) => {
    const haystack = `${participant.folioCode} ${participant.name} ${participant.phone} ${participant.whatsapp} ${participant.email} ${participant.status}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  return json(200, { participants: filtered });
};
