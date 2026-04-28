const {
  initNetlifyBlobs, getMatches, json } = require("./quiniela-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const group = String(event.queryStringParameters?.group || "").toUpperCase();
  const team = normalize(event.queryStringParameters?.team || "");
  const date = String(event.queryStringParameters?.date || "");
  const venue = normalize(event.queryStringParameters?.venue || "");
  const hostCountry = String(event.queryStringParameters?.hostCountry || "");

  const matches = (await getMatches()).filter((match) => {
    const matchDate = String(match.matchDate || match.dateTime || "").slice(0, 10);
    const teams = normalize(`${match.homeTeam} ${match.awayTeam}`);
    const venueText = normalize(`${match.venue || match.stadium} ${match.hostCity || match.city}`);
    return (!group || match.group === group)
      && (!team || teams.includes(team))
      && (!date || matchDate === date)
      && (!venue || venueText.includes(venue))
      && (!hostCountry || getHostCountry(match.hostCity || match.city) === hostCountry);
  });

  return json(200, { matches });
};

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getHostCountry(city) {
  if (["Ciudad de México", "Guadalajara", "Monterrey"].includes(city)) return "México";
  if (["Toronto", "Vancouver"].includes(city)) return "Canadá";
  return "Estados Unidos";
}
