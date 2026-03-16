(function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  window.createDroppyScoringSystem = function createDroppyScoringSystem() {
    const MAX_COMBO = 5;
    const COMBO_WINDOW_MS = 2400;

    let score = 0;
    let combo = 1;
    let comboScore = 0;
    let maxCombo = 1;
    let collected = 0;
    let adaptogens = 0;
    let lastCollectAt = 0;
    let distance = 0;

    let flowTime = 0;
    let flowRamp = 0;
    let flowMultiplier = 1;

    function reset() {
      score = 0;
      combo = 1;
      comboScore = 0;
      maxCombo = 1;
      collected = 0;
      adaptogens = 0;
      lastCollectAt = 0;
      distance = 0;
      flowTime = 0;
      flowRamp = 0;
      flowMultiplier = 1;
    }

    function applyCollect(kind, nowMs) {
      const inWindow = lastCollectAt && nowMs - lastCollectAt < COMBO_WINDOW_MS;
      combo = inWindow ? Math.min(combo + 1, MAX_COMBO) : 1;
      maxCombo = Math.max(maxCombo, combo);
      lastCollectAt = nowMs;

      if (kind === "bean") {
        collected += 1;
        comboScore += Math.round(2 * combo * flowMultiplier);
      } else if (kind === "adaptogen") {
        adaptogens += 1;
        comboScore += Math.round(5 * combo * Math.max(flowMultiplier, 1.15));
      } else if (kind === "spring") {
        flowTime = Math.max(flowTime, 8.5);
        flowRamp = 0;
        comboScore += Math.round(8 * Math.max(combo, 2));
      }
    }

    function update(dt, nowMs, currentDistance) {
      distance = currentDistance;

      if (lastCollectAt && nowMs - lastCollectAt > COMBO_WINDOW_MS * 1.35) {
        combo = 1;
      }

      if (flowTime > 0) {
        flowTime = Math.max(0, flowTime - dt);
        flowRamp = clamp(flowRamp + dt / 2.2, 0, 1);
      } else {
        flowRamp = clamp(flowRamp - dt * 1.8, 0, 1);
      }

      flowMultiplier = 1 + flowRamp * 1.35;
      score = Math.max(0, Math.floor(distance) + comboScore);
    }

    function getModifiers() {
      return {
        speedBonus: flowRamp * 0.18 + (flowTime > 0 ? 0.06 : 0),
      };
    }

    function getSnapshot() {
      return {
        score,
        combo,
        collected,
        adaptogens,
        maxCombo,
        distance,
        flowTime,
        flowIntensity: flowRamp,
        flowMultiplier,
        environmentProgress: clamp(score / 190, 0, 1),
        flowLabel: flowTime > 0 ? `x${flowMultiplier.toFixed(1)}` : "Ready",
      };
    }

    return {
      reset,
      applyCollect,
      update,
      getModifiers,
      getSnapshot,
    };
  };
})();
