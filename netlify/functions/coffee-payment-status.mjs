import { getStore } from "@netlify/blobs";
import { orderResponse as json, publicOrder } from "./coffee-commerce-shared.js";
import { sandboxOrderStore } from "../lib/coffee-mercadopago-orders.cjs";

export default async function paymentStatus(request) {
  if (request.method !== "GET") return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  const orderId = (new URL(request.url).searchParams.get("order") || "").trim();
  if (!orderId) return json(400, { error: "Falta order." });
  const key = `orders/${orderId}.json`;
  const sandbox = process.env.COFFEE_NATURAL_PAYMENT_MODE === "sandbox";
  const read = { type: "json", consistency: "strong" };
  const testOrder = sandbox ? await getStore(sandboxOrderStore).get(key, read) : null;
  const order = testOrder || await getStore("coffee_orders").get(key, read);
  if (!order) return json(404, { error: "Pedido no encontrado." });
  const payment = order.paymentId && !order.providerOrderId
    ? await getStore("coffee_payments").get(`payments/${order.paymentId}.json`, { type: "json" }) : null;
  return json(200, { order: publicOrder(order, payment) });
}
