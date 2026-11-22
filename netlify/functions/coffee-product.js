const { DELIVERY_FEE, DELIVERY_LABEL, getCoffeeProduct, json, naturalCheckoutAvailable } = require("./coffee-commerce-shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  const id = event.queryStringParameters?.product;
  const product = getCoffeeProduct(id);
  if (!product) return json(404, { error: "Café no encontrado." });
  return json(200, {
    product,
    ...(id === "natural" ? { checkoutAvailable: naturalCheckoutAvailable(product) } : {}),
    shipping: {
      deliveryFee: DELIVERY_FEE,
      deliveryLabel: DELIVERY_LABEL,
      pickupLabel: "Recoger en Better Mood Coffee La Paz",
    },
  });
};
