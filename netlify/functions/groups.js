const {
  initNetlifyBlobs, getMatches, json } = require("./football-shared");

exports.handler = async (event) => {
  initNetlifyBlobs(event);
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const groups = (await getMatches()).reduce((acc, match) => {
    acc[match.group] = acc[match.group] || { group: match.group, teams: [], matches: 0 };
    acc[match.group].matches += 1;
    [
      { name: match.homeTeam, flag: match.homeFlag },
      { name: match.awayTeam, flag: match.awayFlag },
    ].forEach((team) => {
      if (!acc[match.group].teams.some((entry) => entry.name === team.name)) acc[match.group].teams.push(team);
    });
    return acc;
  }, {});

  return json(200, { groups: Object.values(groups).sort((a, b) => a.group.localeCompare(b.group)) });
};
