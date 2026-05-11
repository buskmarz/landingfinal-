const {
  initNetlifyBlobs, json, listJSON, requireAdmin } = require("./football-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (!requireAdmin(event)) return json(401, { error: "Unauthorized" });
  const query = String(event.queryStringParameters?.q || "").toLowerCase();
  const payments = await listJSON("payments", "payments/");
  const filtered = payments.filter((payment) => {
    const haystack = `${payment.folioCode} ${payment.externalReference} ${payment.status} ${payment.providerPaymentId} ${payment.preferenceId}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  return json(200, { payments: filtered });
};
