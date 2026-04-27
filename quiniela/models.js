/**
 * @typedef {Object} Participant
 * @property {string} id
 * @property {string} folio
 * @property {string} name
 * @property {string} whatsapp
 * @property {string} email
 * @property {'digital'|'fisico'|'ambos'} participationType
 * @property {boolean} acceptsTerms
 * @property {boolean} acceptsMarketing
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Match
 * @property {string} id
 * @property {string} phase
 * @property {string} group
 * @property {string} homeTeam
 * @property {string} homeFlag
 * @property {string} awayTeam
 * @property {string} awayFlag
 * @property {string} matchDate
 * @property {string} venue
 * @property {string} hostCity
 * @property {'programado'|'en_juego'|'finalizado'} status
 * @property {number | null} homeScore
 * @property {number | null} awayScore
 */

/**
 * @typedef {Object} Prediction
 * @property {string} id
 * @property {string} participantFolio
 * @property {string} matchId
 * @property {string} phaseId
 * @property {number} predictedHomeScore
 * @property {number} predictedAwayScore
 * @property {number} homeScorePrediction
 * @property {number} awayScorePrediction
 * @property {string | null} advancingTeamId
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {boolean} locked
 * @property {string | null} lockedAt
 */

/**
 * @typedef {Object} Score
 * @property {string} participantFolio
 * @property {number} totalPoints
 * @property {number} exactScores
 * @property {number} correctResults
 * @property {Record<string, number>} phasePoints
 */

export {};
