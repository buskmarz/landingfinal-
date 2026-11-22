import { getStore } from "@netlify/blobs";
import { orderResponse as json } from "./coffee-commerce-shared.js";
import {
  isProviderOrderId, lookupProviderOrder, matchesOrder, ordersConfig, validSignature,
} from "../lib/coffee-mercadopago-orders.cjs";

export async function ordersWebhook(request, getOrderStore = getStore) {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  const config = ordersConfig();
  if (!config) return json(503, { error: "Orders is not configured" });

  const query = new URL(request.url).searchParams;
  const providerOrderId = query.get("data.id");
  if (!isProviderOrderId(providerOrderId, config.mode) || !validSignature(request.headers, providerOrderId, config.webhookSecret)) {
    return json(401, { error: "Invalid signature or order" });
  }
  if (query.get("type") !== "order") return json(200, { received: true });

  try {
    const resource = await lookupProviderOrder(providerOrderId, config);
    if (!resource || resource.id !== providerOrderId || !/^BMC-[A-Z0-9]+-[A-F0-9]{8}$/.test(resource.external_reference || "")) {
      return json(200, { received: true, ignored: "unrecognized_order" });
    }
    const approved = resource.status === "processed" && resource.status_detail === "accredited";
    const failedAttempt = resource.status === "action_required" && resource.status_detail === "waiting_retry" &&
      resource.transactions?.payments?.some(payment => payment.status === "failed");
    const failed = ["failed", "canceled", "expired"].includes(resource.status) || failedAttempt;
    const checkoutClosed = ["canceled","expired"].includes(resource.status) ||
      resource.status === "failed" && resource.status_detail === "max_attempts_exceeded";
    const needsReview = ["refunded", "charged_back"].includes(resource.status) || resource.status_detail === "partially_refunded";
    if (!approved && !failed && !needsReview) return json(200, { received: true, pending: true });

    const key = `orders/${resource.external_reference}.json`;
    const store = getOrderStore(config.orderStore);
    const stored = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
    if (!stored?.etag) return json(503, { error: "Order not available yet" });
    const order = stored.data;
    if ((order.providerOrderId && order.providerOrderId !== providerOrderId) || !matchesOrder(resource, order, config)) {
      return json(200, { received: true, ignored: "order_mismatch" });
    }
    if (approved && Number(resource.total_paid_amount) !== order.totalAmount) {
      return json(200, { received: true, ignored: "amount_mismatch" });
    }

    const status = needsReview ? "payment_review" : approved ? "paid" : "payment_failed";
    if ((order.status === status && !!order.checkoutClosed === checkoutClosed) || order.status === "payment_review" || (order.status === "paid" && failed)) {
      return json(200, { received: true, unchanged: true });
    }
    const now = new Date().toISOString();
    const updated = await store.setJSON(key, {
      ...order,
      providerOrderId,
      checkoutClosed,
      status,
      paymentStatus: needsReview ? "review" : approved ? "paid" : "failed",
      updatedAt: now,
      ...(approved ? { pickupStatus: "pending_pickup", paidAt: now } : {}),
      ...(needsReview ? { pickupStatus: "not_ready" } : {}),
    }, { onlyIfMatch: stored.etag });
    if (!updated?.modified) return json(503, { error: "Order changed; retry notification" });
    return json(200, { received: true });
  } catch {
    return json(503, { error: "Unable to confirm payment status" });
  }
}

export default (request) => ordersWebhook(request);
