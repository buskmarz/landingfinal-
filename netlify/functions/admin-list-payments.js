const { json, listJSON, requireAdmin } = require("./quiniela-shared");

exports.handler = async (event) => {
  if (!requireAdmin(event)) return json(401, { error: "Unauthorized" });
  const query = String(event.queryStringParameters?.q || "").toLowerCase();
  const payments = await listJSON("payments", "payments/");
  const filtered = payments.filter((payment) => {
    const haystack = `${payment.folioCode} ${payment.externalReference} ${payment.status} ${payment.providerPaymentId} ${payment.preferenceId}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  return json(200, { payments: filtered });
};
