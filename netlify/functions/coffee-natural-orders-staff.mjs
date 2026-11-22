import { getStore } from "@netlify/blobs";
import { orderResponse as json, requireAdmin } from "./coffee-commerce-shared.js";
import { ordersConfig } from "../lib/coffee-mercadopago-orders.cjs";

const ID = /^BMC-[A-Z0-9]+-[A-F0-9]{8}$/;
const STRONG = {type:"json",consistency:"strong"};
const transitions = {pending_pickup:"ready",ready:"fulfilled"};
const isNaturalOrder = order => order?.product?.sku === "BMC-NATURAL";
const canFulfill = order => isNaturalOrder(order) && order.status === "paid" && order.paymentStatus === "paid";

export async function staffNaturalOrders(request, openStore = getStore) {
  if (!requireAdmin({headers:{"x-admin-secret":request.headers.get("x-admin-secret")}})) return json(401,{error:"Acceso incorrecto."});
  const config = ordersConfig();
  if (!config) return json(503,{error:"La bandeja de café natural todavía no está configurada."});
  const store = openStore(config.orderStore);
  try {
    if (request.method === "GET") {
      const {blobs} = await store.list({prefix:"orders/"});
      const records = await Promise.all(blobs.map(row => store.get(row.key,STRONG)));
      const orders = records.filter(order => isNaturalOrder(order) &&
        (order.status === "payment_review" || canFulfill(order) && order.pickupStatus !== "fulfilled"))
        .sort((left,right)=>String(left.createdAt).localeCompare(String(right.createdAt)));
      return json(200,{orders});
    }
    if (request.method !== "POST") return json(405,{error:"Método no permitido."},{Allow:"GET, POST"});
    if (request.headers.get("origin") !== config.origin) return json(403,{error:"Abre la bandeja de Better Mood para continuar."});
    const text = await request.text();
    if (Buffer.byteLength(text) > 1000) return json(413,{error:"Solicitud demasiado grande."});
    let body;
    try { body = JSON.parse(text); } catch { return json(400,{error:"Solicitud inválida."}); }
    if (!body || !ID.test(body.id || "") || !["ready","fulfilled"].includes(body.status)) return json(400,{error:"Pedido inválido."});
    const key = "orders/" + body.id + ".json";
    const saved = await store.getWithMetadata(key,STRONG);
    if (!saved?.etag || !canFulfill(saved.data)) return json(409,{error:"El pago debe estar confirmado para preparar el pedido."});
    if (saved.data.pickupStatus === body.status) return json(200,{ok:true});
    if (transitions[saved.data.pickupStatus] !== body.status) return json(409,{error:"El pedido cambió. Actualiza la bandeja."});
    const updated = await store.setJSON(key,{...saved.data,pickupStatus:body.status,updatedAt:new Date().toISOString()},{onlyIfMatch:saved.etag});
    if (!updated.modified) return json(409,{error:"El pedido cambió. Actualiza la bandeja."});
    return json(200,{ok:true});
  } catch {
    return json(503,{error:"No se pudo consultar la bandeja. Intenta de nuevo."});
  }
}

export default (request) => staffNaturalOrders(request);
