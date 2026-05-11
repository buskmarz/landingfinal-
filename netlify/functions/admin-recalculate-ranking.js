const {
  initNetlifyBlobs, json, requireAdmin } = require("./football-shared");
const ranking = require("./ranking");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!requireAdmin(event)) return json(401, { error: "Unauthorized" });

  return ranking.handler({
    ...event,
    httpMethod: "GET",
    queryStringParameters: { phase: event.queryStringParameters?.phase || "general" },
  });
};
