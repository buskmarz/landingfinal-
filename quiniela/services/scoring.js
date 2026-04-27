export function computePredictionPoints(predictedHomeScore, predictedAwayScore, actualHomeScore, actualAwayScore) {
  const predictedDiff = predictedHomeScore - predictedAwayScore;
  const actualDiff = actualHomeScore - actualAwayScore;

  if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
    return {
      points: 5,
      exactScore: true,
      correctResult: true,
      correctGoalDiff: true,
      correctHomeGoals: true,
      correctAwayGoals: true
    };
  }

  let points = 0;

  const predictedResult = Math.sign(predictedDiff);
  const actualResult = Math.sign(actualDiff);
  const correctResult = predictedResult === actualResult;
  if (correctResult) {
    points += 3;
  }

  const correctGoalDiff = predictedDiff === actualDiff;
  if (correctGoalDiff) {
    points += 2;
  }

  const correctHomeGoals = predictedHomeScore === actualHomeScore;
  if (correctHomeGoals) {
    points += 1;
  }

  const correctAwayGoals = predictedAwayScore === actualAwayScore;
  if (correctAwayGoals) {
    points += 1;
  }

  return {
    points,
    exactScore: false,
    correctResult,
    correctGoalDiff,
    correctHomeGoals,
    correctAwayGoals
  };
}

export function buildScoreSummary(participantFolio, participantPredictions, matches) {
  const score = {
    participantFolio,
    totalPoints: 0,
    exactScores: 0,
    correctResults: 0,
    phasePoints: {}
  };

  const matchesById = Object.fromEntries(matches.map((match) => [match.id, match]));

  participantPredictions.forEach((prediction) => {
    const match = matchesById[prediction.matchId];
    if (!match || match.homeScore === null || match.awayScore === null) {
      return;
    }

    const result = computePredictionPoints(
      prediction.predictedHomeScore,
      prediction.predictedAwayScore,
      match.homeScore,
      match.awayScore
    );

    score.totalPoints += result.points;
    if (result.exactScore) {
      score.exactScores += 1;
    }
    if (result.correctResult) {
      score.correctResults += 1;
    }

    score.phasePoints[match.phase] = (score.phasePoints[match.phase] || 0) + result.points;
  });

  return score;
}
