const { json, listJSON, requireAdmin } = require("./quiniela-shared");

exports.handler = async (event) => {
  if (!requireAdmin(event)) return json(401, { error: "Unauthorized" });
  const predictions = await listJSON("predictions", "predictions/");
  return json(200, { predictions });
};
