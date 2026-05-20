const { DELIVERY_FEE, DELIVERY_LABEL, json, PRODUCT } = require("./coffee-commerce-shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" }, { Allow: "GET" });
  return json(200, {
    product: PRODUCT,
    shipping: {
      deliveryFee: DELIVERY_FEE,
      deliveryLabel: DELIVERY_LABEL,
      pickupLabel: "Recoger en Better Mood Coffee La Paz",
    },
  });
};
