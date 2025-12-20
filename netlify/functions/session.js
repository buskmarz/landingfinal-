const crypto = require("crypto");
const {
  json,
  signToken,
  hashValue,
  getClientIp,
  getUserAgent,
  getWeekStartKey,
  SESSION_TTL_MS,
} = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  }

  const now = Date.now();
  const ip = getClientIp(event);
  const ua = getUserAgent(event);
  const fingerprint = hashValue(`${ip}|${ua}`);

  const payload = {
    sid: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
    iat: now,
    exp: now + SESSION_TTL_MS,
    fp: fingerprint,
    seed: crypto.randomBytes(4).readUInt32BE(0),
  };

  const token = signToken(payload);

  return json(200, {
    token,
    seed: payload.seed,
    expiresAt: payload.exp,
    weekStart: getWeekStartKey(),
  });
};
