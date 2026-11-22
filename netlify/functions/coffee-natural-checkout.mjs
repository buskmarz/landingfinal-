import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import {
  CURRENCY, DELIVERY_FEE, DELIVERY_LABEL, checkRateLimit, getCoffeeProduct, isValidEmail,
  naturalCheckoutAvailable, normalizeEmail, normalizePhone, orderResponse as json, sanitizeText,
} from "./coffee-commerce-shared.js";
import { createProviderOrder, ordersConfig } from "../lib/coffee-mercadopago-orders.cjs";

const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const STRONG = {type:"json",consistency:"strong"};

export async function naturalCheckout(request, context, openStore = getStore, rateLimit = checkRateLimit) {
  if (request.method !== "POST") return json(405,{error:"Método no permitido."},{Allow:"POST"});
  const config = ordersConfig();
  const product = getCoffeeProduct("natural");
  if (!config || !naturalCheckoutAvailable(product,config)) return json(503,{error:"La compra en línea aún no está disponible."});
  if (request.headers.get("origin") !== config.origin) return json(403,{error:"Abre la página de Nuestro café para continuar."});
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json(415,{error:"Formato de pedido inválido."});
  const text = await request.text();
  if (Buffer.byteLength(text) > 6000) return json(413,{error:"El pedido es demasiado extenso."});
  let body;
  try { body = JSON.parse(text); } catch { return json(400,{error:"Revisa los datos del pedido."}); }
  if (!body || !UUID.test(body.requestId || "")) return json(400,{error:"No pudimos identificar el pedido. Recarga la página."});
  const name = sanitizeText(body.name,120);
  const phone = normalizePhone(body.phone);
  const email = normalizeEmail(body.email);
  const quantity = Number(body.quantity);
  const method = body.fulfillmentMethod;
  if (!name || phone.replace(/\D/g,"").length < 10 || (email && !isValidEmail(email)) || body.acceptsTerms !== true ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 6 || !["pickup","delivery"].includes(method)) {
    return json(400,{error:"Revisa el nombre, WhatsApp y datos del pedido."});
  }
  const deliveryAddress = method === "delivery" ? {
    street:sanitizeText(body.deliveryStreet,160), neighborhood:sanitizeText(body.deliveryNeighborhood,120),
    city:sanitizeText(body.deliveryCity || "Puebla",80), references:sanitizeText(body.deliveryReferences,220),
  } : null;
  if (deliveryAddress && (!deliveryAddress.street || !deliveryAddress.neighborhood)) return json(400,{error:"Ingresa calle y colonia."});
  const customer = {name,phone,...(email?{email}:{})};
  const notes = sanitizeText(body.notes,240);
  const fingerprint = createHash("sha256").update(JSON.stringify([customer,method,deliveryAddress,quantity,notes,body.expectedTotal])).digest("hex");
  const identifier = body.requestId.replace(/-/g,"").toUpperCase();
  const id = "BMC-" + identifier.slice(0,24) + "-" + identifier.slice(24);
  const key = "orders/" + id + ".json";
  const store = openStore(config.orderStore);
  try {
    let saved = await store.getWithMetadata(key,STRONG);
    if (!saved) {
      const rate = await rateLimit("coffee-natural-checkout",{headers:{"client-ip":context?.ip || "unknown"}},10,60000);
      if (!rate.allowed) return json(429,{error:"Espera un minuto antes de reintentar."});
      const shippingFee = method === "delivery" ? DELIVERY_FEE : 0;
      const totalAmount = Number((product.unitPrice * quantity + shippingFee).toFixed(2));
      if (body.expectedTotal !== totalAmount) return json(409,{error:"Cambió el importe. Revísalo antes de continuar."});
      const now = new Date().toISOString();
      await store.setJSON(key,{
        id, fingerprint, status:"pending_payment",paymentStatus:"pending",pickupStatus:"not_ready",
        source:"cafe_natural_page",product,quantity,unitPrice:product.unitPrice,shippingFee,totalAmount,currency:CURRENCY,
        fulfillment:{method,label:method==="delivery"?DELIVERY_LABEL:"Recoger en Better Mood Coffee La Paz",address:"13 Poniente 2302/F, Col. La Paz, Puebla",deliveryAddress},
        customer,notes,paymentId:"pay_" + body.requestId,createdAt:now,updatedAt:now,paidAt:null,
      },{onlyIfNew:true});
      saved = await store.getWithMetadata(key,STRONG);
    }
    if (!saved?.etag) return json(503,{error:"No pudimos guardar el pedido. Reintenta."});
    if (saved.data.fingerprint !== fingerprint) return json(409,{error:"El intento anterior tiene otros datos. Revisa el pedido."});
    if (saved.data.checkoutClosed || ["paid","payment_review"].includes(saved.data.status)) return json(200,{orderId:id});
    if (saved.data.checkoutUrl) return json(200,{orderId:id,checkoutUrl:saved.data.checkoutUrl});
    const provider = await createProviderOrder(saved.data,config,body.requestId);
    for (let attempt = 0; attempt < 5; attempt++) {
      if (saved.data.checkoutClosed || ["paid","payment_review"].includes(saved.data.status)) return json(200,{orderId:id});
      if (saved.data.providerOrderId && saved.data.providerOrderId !== provider.providerOrderId) return json(409,{error:"Consulta el estado de tu pedido."});
      if (saved.data.checkoutUrl || (await store.setJSON(key,{...saved.data,...provider},{onlyIfMatch:saved.etag})).modified) {
        return json(200,{orderId:id,checkoutUrl:saved.data.checkoutUrl || provider.checkoutUrl});
      }
      saved = await store.getWithMetadata(key,STRONG);
      if (!saved?.etag) break;
    }
    return json(503,{error:"No se pudo confirmar el enlace. Reintenta el mismo pedido."});
  } catch {
    return json(503,{error:"No se pudo iniciar el pago. Reintenta el mismo pedido."});
  }
}

export default (request,context) => naturalCheckout(request,context);
