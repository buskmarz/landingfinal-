import { DATA_VERSION, MOCK_MATCHES, MOCK_RANKING, PHASES } from '../data/mockData.js';
import { buildScoreSummary } from './scoring.js';

const STORAGE_KEYS = {
  participants: 'bm26.participants',
  predictions: 'bm26.predictions',
  folioSequence: 'bm26.folioSequence',
  matches: 'bm26.matches',
  dataVersion: 'bm26.dataVersion'
};

function readJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Storage parsing fallback for key:', key, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureMatchesStorage() {
  const storedMatches = readJSON(STORAGE_KEYS.matches, null);
  const storedVersion = localStorage.getItem(STORAGE_KEYS.dataVersion);

  if (!storedMatches || storedVersion !== DATA_VERSION) {
    writeJSON(STORAGE_KEYS.matches, MOCK_MATCHES);
    localStorage.setItem(STORAGE_KEYS.dataVersion, DATA_VERSION);
    return [...MOCK_MATCHES];
  }

  return storedMatches;
}

function nextFolioNumber() {
  const current = Number(localStorage.getItem(STORAGE_KEYS.folioSequence) || '0');
  const next = current + 1;
  localStorage.setItem(STORAGE_KEYS.folioSequence, String(next));
  return next;
}

function buildFolio(number) {
  return `BM26-${String(number).padStart(6, '0')}`;
}

function buildId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function getPhases() {
  return PHASES;
}

export function getMatches() {
  return ensureMatchesStorage();
}

export function getMatchesByPhase(phaseId) {
  return getMatches().filter((match) => match.phase === phaseId);
}

export function isMatchLocked(matchDate) {
  return new Date(matchDate).getTime() <= Date.now();
}

export function getParticipants() {
  return readJSON(STORAGE_KEYS.participants, []);
}

export function getPredictions() {
  return readJSON(STORAGE_KEYS.predictions, []);
}

export function getParticipantByFolio(folio) {
  return getParticipants().find((participant) => participant.folio === folio) || null;
}

export function createParticipant(input) {
  const participants = getParticipants();

  let folio;
  do {
    folio = buildFolio(nextFolioNumber());
  } while (participants.some((participant) => participant.folio === folio));

  const participant = {
    id: buildId('participant'),
    folio,
    name: input.name.trim(),
    whatsapp: input.whatsapp.trim(),
    email: input.email.trim().toLowerCase(),
    participationType: input.participationType,
    acceptsTerms: Boolean(input.acceptsTerms),
    acceptsMarketing: Boolean(input.acceptsMarketing),
    createdAt: new Date().toISOString()
  };

  participants.push(participant);
  writeJSON(STORAGE_KEYS.participants, participants);

  return participant;
}

export function savePredictions(participantFolio, phaseId, predictionInputs) {
  const participant = getParticipantByFolio(participantFolio);
  if (!participant) {
    throw new Error('Folio no encontrado.');
  }

  const matches = getMatchesByPhase(phaseId);
  const allowedIds = new Set(matches.map((match) => match.id));

  const predictions = getPredictions();
  const nowIso = new Date().toISOString();
  const blockedMatches = [];

  predictionInputs.forEach((item) => {
    if (!allowedIds.has(item.matchId)) {
      return;
    }

    const match = matches.find((entry) => entry.id === item.matchId);
    const matchLocked = isMatchLocked(match.matchDate);

    const existing = predictions.find(
      (prediction) => prediction.participantFolio === participantFolio && prediction.matchId === item.matchId
    );

    if (matchLocked) {
      if (existing) {
        existing.locked = true;
        existing.updatedAt = nowIso;
      }
      blockedMatches.push(item.matchId);
      return;
    }

    if (existing) {
      existing.predictedHomeScore = item.predictedHomeScore;
      existing.predictedAwayScore = item.predictedAwayScore;
      existing.updatedAt = nowIso;
      existing.locked = false;
      return;
    }

    predictions.push({
      id: buildId('prediction'),
      participantFolio,
      matchId: item.matchId,
      predictedHomeScore: item.predictedHomeScore,
      predictedAwayScore: item.predictedAwayScore,
      createdAt: nowIso,
      updatedAt: nowIso,
      locked: false
    });
  });

  writeJSON(STORAGE_KEYS.predictions, predictions);

  return {
    savedCount: predictionInputs.length - blockedMatches.length,
    blockedMatches
  };
}

export function getPredictionsByParticipantAndPhase(participantFolio, phaseId) {
  const matchIds = new Set(getMatchesByPhase(phaseId).map((match) => match.id));

  return getPredictions().filter(
    (prediction) => prediction.participantFolio === participantFolio && matchIds.has(prediction.matchId)
  );
}

export function updateMatchResult(matchId, homeScore, awayScore, status = 'finalizado') {
  const matches = getMatches();
  const target = matches.find((match) => match.id === matchId);

  if (!target) {
    throw new Error('Partido no encontrado.');
  }

  target.homeScore = homeScore;
  target.awayScore = awayScore;
  target.status = status;

  writeJSON(STORAGE_KEYS.matches, matches);

  return target;
}

export function getRanking() {
  const participants = getParticipants();
  const predictions = getPredictions();
  const matches = getMatches();

  if (participants.length === 0) {
    return MOCK_RANKING;
  }

  const computed = participants.map((participant) => {
    const participantPredictions = predictions.filter(
      (prediction) => prediction.participantFolio === participant.folio
    );

    const score = buildScoreSummary(participant.folio, participantPredictions, matches);

    return {
      participantFolio: participant.folio,
      name: participant.name,
      totalPoints: score.totalPoints,
      exactScores: score.exactScores,
      correctResults: score.correctResults,
      createdAt: participant.createdAt
    };
  });

  return computed.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function resetQuinielaMockData() {
  // TODO: remover en producción; solo útil para QA local
  localStorage.removeItem(STORAGE_KEYS.participants);
  localStorage.removeItem(STORAGE_KEYS.predictions);
  localStorage.removeItem(STORAGE_KEYS.folioSequence);
  localStorage.removeItem(STORAGE_KEYS.matches);
  localStorage.removeItem(STORAGE_KEYS.dataVersion);
}

// TODO backend: reemplazar lecturas/escrituras de localStorage por API o BaaS.
// TODO backend: agregar auth para administración y auditoría de cambios.
// TODO backend: agregar sincronización multi-dispositivo por participante.
