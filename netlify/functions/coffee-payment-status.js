const {
  getJSON,
  initNetlifyBlobs,
  json,
  publicOrder,
} = require("./coffee-commerce-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  const orderId = String(event.queryStringParameters?.order || "").trim();
  if (!orderId) return json(400, { error: "Falta order." });
  const order = await getJSON("coffee_orders", `orders/${orderId}.json`);
  if (!order) return json(404, { error: "Pedido no encontrado." });
  const payment = order.paymentId ? await getJSON("coffee_payments", `payments/${order.paymentId}.json`) : null;
  return json(200, { order: publicOrder(order, payment) });
};
