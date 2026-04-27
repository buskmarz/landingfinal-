export function calculateMatchPoints(prediction, result) {
  const actualHomeScore = result.homeScore ?? result.homeScoreResult;
  const actualAwayScore = result.awayScore ?? result.awayScoreResult;
  const predictedHomeScore = prediction.predictedHomeScore ?? prediction.homeScorePrediction;
  const predictedAwayScore = prediction.predictedAwayScore ?? prediction.awayScorePrediction;

  if (actualHomeScore === null || actualAwayScore === null || actualHomeScore === undefined || actualAwayScore === undefined) {
    return null;
  }

  if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
    return {
      points: 5,
      exactScore: true,
      correctResult: true
    };
  }

  const predictedResult = Math.sign(predictedHomeScore - predictedAwayScore);
  const actualResult = Math.sign(actualHomeScore - actualAwayScore);

  if (predictedResult === actualResult) {
    return {
      points: 3,
      exactScore: false,
      correctResult: true
    };
  }

  return {
    points: 0,
    exactScore: false,
    correctResult: false
  };
}

export function computePredictionPoints(predictedHomeScore, predictedAwayScore, actualHomeScore, actualAwayScore) {
  return calculateMatchPoints(
    { predictedHomeScore, predictedAwayScore },
    { homeScore: actualHomeScore, awayScore: actualAwayScore }
  ) || { points: 0, exactScore: false, correctResult: false };
}

export function buildScoreSummary(participantFolio, participantPredictions, matches) {
  const score = {
    participantFolio,
    totalPoints: 0,
    exactScores: 0,
    correctResults: 0,
    completedPhasesCount: 0,
    earliestPredictionAt: null,
    phasePoints: {},
    phaseCompletions: {}
  };

  const matchesById = Object.fromEntries(matches.map((match) => [match.id, match]));
  const predictionsByPhase = {};

  participantPredictions.forEach((prediction) => {
    const match = matchesById[prediction.matchId];
    if (!match) return;

    if (!score.earliestPredictionAt || new Date(prediction.createdAt).getTime() < new Date(score.earliestPredictionAt).getTime()) {
      score.earliestPredictionAt = prediction.createdAt;
    }

    predictionsByPhase[match.phase] = predictionsByPhase[match.phase] || new Set();
    predictionsByPhase[match.phase].add(prediction.matchId);

    const result = calculateMatchPoints(prediction, match);
    if (!result) return;

    score.totalPoints += result.points;
    if (result.exactScore) score.exactScores += 1;
    if (result.correctResult) score.correctResults += 1;

    score.phasePoints[match.phase] = (score.phasePoints[match.phase] || 0) + result.points;
  });

  Object.entries(predictionsByPhase).forEach(([phaseId, predictedMatchIds]) => {
    const phaseMatches = matches.filter((match) => match.phase === phaseId);
    const complete = phaseMatches.length > 0 && predictedMatchIds.size >= phaseMatches.length;
    score.phaseCompletions[phaseId] = {
      saved: predictedMatchIds.size,
      total: phaseMatches.length,
      complete
    };
    if (complete) score.completedPhasesCount += 1;
  });

  return score;
}
