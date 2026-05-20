const {
  initNetlifyBlobs,
  json,
  listJSON,
  requireAdmin,
} = require("./coffee-commerce-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  if (!requireAdmin(event)) return json(401, { error: "No autorizado." });
  const q = String(event.queryStringParameters?.q || "").toLowerCase().trim();
  const orders = await listJSON("coffee_orders", "orders/");
  const filtered = q
    ? orders.filter((order) => `${order.id} ${order.customer?.name} ${order.customer?.phone} ${order.customer?.email} ${order.status}`.toLowerCase().includes(q))
    : orders;
  filtered.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return json(200, { orders: filtered });
};
