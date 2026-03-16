(() => {
  const root = document.querySelector("[data-droppy]");
  if (!root) return;

  const canvas = root.querySelector("#droppy-canvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  if (
    typeof window.createDroppyBackgroundSystem !== "function" ||
    typeof window.createDroppyEffectsSystem !== "function" ||
    typeof window.createDroppyPhysicsSystem !== "function" ||
    typeof window.createDroppyScoringSystem !== "function" ||
    typeof window.createDroppyAudioSystem !== "function"
  ) {
    console.warn("[droppy] Missing module bootstrap.");
    return;
  }

  const scoreEl = root.querySelector("[data-score]");
  const comboEl = root.querySelector("[data-combo]");
  const flowEl = root.querySelector("[data-flow]");
  const finalScoreEl = root.querySelector("[data-final-score]");
  const overlayStart = root.querySelector('[data-overlay="start"]');
  const overlayGameover = root.querySelector('[data-overlay="gameover"]');
  const overlayPause = root.querySelector('[data-overlay="pause"]');
  const playBtn = root.querySelector("[data-play]");
  const retryBtn = root.querySelector(".droppy__retry");
  const form = root.querySelector("[data-form]");
  const formNote = root.querySelector("[data-form-note]");
  const leaderboardList = root.querySelector("[data-leaderboard]");
  const leaderboardToggle = root.querySelector("[data-leaderboard-toggle]");
  const periodLabelEl = root.querySelector("[data-period-label]");
  const leaderboardCard = root.querySelector(".droppy__leaderboard");
  const periodPrevBtn = root.querySelector("[data-period-prev]");
  const periodNextBtn = root.querySelector("[data-period-next]");
  const filterButtons = Array.from(root.querySelectorAll("[data-period]"));
  const rankEl = root.querySelector("[data-rank]");
  const shareBtn = root.querySelector(".droppy__share");
  const pauseBtn = root.querySelector(".droppy__pause");
  const resumeBtn = root.querySelector(".droppy__resume");
  const restartBtn = root.querySelector(".droppy__restart");
  const canvasFrame = root.querySelector(".droppy__canvas-frame");
  const connectionEl = root.querySelector("[data-connection]");

  const API_BASE = "/api";
  const isLocalPreview = ["127.0.0.1", "localhost"].includes(window.location.hostname);

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;

  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const world = {
    width: 0,
    height: 0,
    groundY: 0,
  };

  let sessionToken = null;
  let sessionSeed = Date.now();
  let entryId = null;
  let showTopTen = false;
  let lastLeaderboardData = null;
  let currentPeriod = "weekly";
  const periodOffsets = { weekly: 0, monthly: 0 };

  let state = "idle";
  let running = false;
  let rafId = 0;
  let lastRealNow = 0;
  let simNow = 0;
  let gameStart = 0;
  let lastScoreRendered = -1;
  let lastComboRendered = -1;
  let lastFlowRendered = "";

  let rng = mulberry32(sessionSeed);
  const random = () => rng();

  const background = window.createDroppyBackgroundSystem({ random });
  const effects = window.createDroppyEffectsSystem({ random });
  const physics = window.createDroppyPhysicsSystem({ random });
  const scoring = window.createDroppyScoringSystem();
  const audio = window.createDroppyAudioSystem();

  const droppyImage = new Image();
  let droppyReady = false;
  let droppyAspect = 1;
  droppyImage.onload = () => {
    droppyReady = true;
    droppyAspect = droppyImage.naturalWidth / droppyImage.naturalHeight || 1;
  };
  droppyImage.src = "assets/droppy.PNG";

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    world.width = rect.width;
    world.height = rect.height;
    world.groundY = rect.height * 0.9;
    physics.resize(rect.width, rect.height);
    background.resize(world);
    draw();
  }

  function setFullscreenMode(enabled) {
    root.classList.toggle("droppy--fullscreen", enabled);
    document.body.classList.toggle("droppy-lock", enabled);
    if (enabled && canvasFrame) {
      canvasFrame.scrollIntoView({ behavior: "auto", block: "start" });
    }
    requestAnimationFrame(() => resizeCanvas());
  }

  function toggleFullscreen() {
    setFullscreenMode(!root.classList.contains("droppy--fullscreen"));
  }

  function setOverlay(which) {
    if (overlayStart) overlayStart.hidden = which !== "start";
    if (overlayGameover) overlayGameover.hidden = which !== "gameover";
    if (overlayPause) overlayPause.hidden = which !== "pause";
  }

  function setConnectionNote(message) {
    if (connectionEl) connectionEl.textContent = message;
  }

  async function requestSession() {
    if (isLocalPreview) {
      sessionToken = null;
      sessionSeed = Date.now();
      rng = mulberry32(sessionSeed);
      setConnectionNote("Modo local: juego offline, sin leaderboard.");
      return null;
    }
    setConnectionNote("Conectando...");
    try {
      const res = await fetch(`${API_BASE}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("session");
      const data = await res.json();
      sessionToken = data.token;
      sessionSeed = data.seed || Date.now();
      rng = mulberry32(Number(sessionSeed) || Date.now());
      setConnectionNote("Listo para jugar.");
      return data;
    } catch (error) {
      sessionToken = null;
      sessionSeed = Date.now();
      rng = mulberry32(sessionSeed);
      setConnectionNote("Sin conexion: puedes jugar, pero no guardar score.");
      return null;
    }
  }

  function resetGame() {
    physics.reset();
    scoring.reset();
    effects.reset();
    background.reset(world);
    simNow = 0;
    gameStart = 0;
    lastScoreRendered = -1;
    lastComboRendered = -1;
    lastFlowRendered = "";
    updateHud();
  }

  function updateHud() {
    const scoreState = scoring.getSnapshot();
    if (scoreEl && scoreState.score !== lastScoreRendered) {
      scoreEl.textContent = String(scoreState.score);
      pulseElement(scoreEl);
      lastScoreRendered = scoreState.score;
    }
    if (comboEl && scoreState.combo !== lastComboRendered) {
      comboEl.textContent = `x${scoreState.combo}`;
      pulseElement(comboEl);
      lastComboRendered = scoreState.combo;
    }
    if (flowEl && scoreState.flowLabel !== lastFlowRendered) {
      flowEl.textContent = scoreState.flowLabel;
      pulseElement(flowEl);
      lastFlowRendered = scoreState.flowLabel;
    }
  }

  function pulseElement(el) {
    if (!el) return;
    el.classList.remove("is-pulse");
    void el.offsetWidth;
    el.classList.add("is-pulse");
  }

  function startLoop() {
    cancelAnimationFrame(rafId);
    running = true;
    lastRealNow = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function startGame() {
    if (state === "playing") return;
    audio.ensureStarted();
    audio.resume();
    if (window.matchMedia("(max-width: 900px)").matches) {
      setFullscreenMode(true);
    }
    state = "loading";
    setOverlay("start");
    if (pauseBtn) pauseBtn.disabled = true;
    requestSession().finally(() => {
      resetGame();
      state = "playing";
      running = true;
      gameStart = performance.now();
      if (pauseBtn) {
        pauseBtn.disabled = false;
        pauseBtn.textContent = "II";
      }
      if (form) form.hidden = true;
      entryId = null;
      setOverlay(null);
      draw();
      startLoop();
    });
  }

  function endGame() {
    state = "gameover";
    running = false;
    cancelAnimationFrame(rafId);
    audio.suspend();
    setOverlay("gameover");
    setFullscreenMode(false);
    const scoreState = scoring.getSnapshot();
    if (finalScoreEl) finalScoreEl.textContent = String(scoreState.score);
    if (pauseBtn) pauseBtn.disabled = true;
    showForm("Nombre + Instagram o telefono.");
  }

  function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    running = false;
    cancelAnimationFrame(rafId);
    audio.suspend();
    if (pauseBtn) pauseBtn.textContent = ">";
    setOverlay("pause");
  }

  function resumeGame() {
    if (state !== "paused") return;
    state = "playing";
    audio.resume();
    if (pauseBtn) pauseBtn.textContent = "II";
    setOverlay(null);
    startLoop();
  }

  function jump() {
    if (state !== "playing") return;
    if (physics.jump()) {
      audio.resume();
    }
  }

  function drawGround(environmentProgress) {
    const top = world.groundY - 12;
    const grass = ctx.createLinearGradient(0, top, 0, world.groundY + 18);
    grass.addColorStop(0, `rgba(${Math.round(lerp(176, 146, environmentProgress))}, ${Math.round(lerp(232, 202, environmentProgress))}, ${Math.round(lerp(143, 124, environmentProgress))}, 1)`);
    grass.addColorStop(1, `rgba(${Math.round(lerp(109, 93, environmentProgress))}, ${Math.round(lerp(187, 166, environmentProgress))}, ${Math.round(lerp(105, 98, environmentProgress))}, 1)`);
    ctx.fillStyle = grass;
    ctx.fillRect(0, top, world.width, 18);

    const soil = ctx.createLinearGradient(0, world.groundY, 0, world.height + 10);
    soil.addColorStop(0, "rgba(180, 137, 92, 1)");
    soil.addColorStop(0.54, "rgba(137, 96, 56, 1)");
    soil.addColorStop(1, "rgba(82, 53, 30, 1)");
    ctx.fillStyle = soil;
    ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY + 8);

    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let x = 0; x < world.width + 26; x += 32) {
      ctx.fillRect(x, world.groundY - 6, 14, 3);
    }
  }

  function drawRunner(snapshot, scoreState) {
    const runner = snapshot.runner;
    const x = runner.x;
    const y = runner.y;
    const width = runner.width;
    const height = runner.height;
    const flowIntensity = scoreState.flowIntensity;

    ctx.save();
    const shadowX = x + width * 0.5;
    const shadowY = world.groundY + 6;
    const shadowW = width * (0.42 + flowIntensity * 0.08);
    const shadow = ctx.createRadialGradient(shadowX, shadowY, 2, shadowX, shadowY, shadowW);
    shadow.addColorStop(0, "rgba(0,0,0,0.24)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, shadowW, width * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    if (flowIntensity > 0.05) {
      const aura = ctx.createRadialGradient(
        x + width * 0.5,
        y + height * 0.5,
        width * 0.16,
        x + width * 0.5,
        y + height * 0.5,
        width * (0.8 + flowIntensity * 0.8)
      );
      aura.addColorStop(0, `rgba(255,255,225,${0.3 + flowIntensity * 0.22})`);
      aura.addColorStop(0.55, `rgba(245,255,174,${0.18 + flowIntensity * 0.12})`);
      aura.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(x + width * 0.5, y + height * 0.5, width * (1.2 + flowIntensity * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    const airborne = !runner.isGrounded;
    const stretch = airborne && runner.velY < -80 ? 1.08 : runner.velY > 100 ? 0.92 : 1;
    const squash = runner.velY > 110 ? 1.08 : 1;
    const bounce = runner.isGrounded ? Math.sin(simNow * 0.018) * 0.02 : 0;
    const originX = x + width * 0.5;
    const originY = y + height * 0.82;
    ctx.translate(originX, originY);
    ctx.scale(squash - bounce * 0.5, stretch + bounce);
    ctx.translate(-originX, -originY);

    if (droppyReady) {
      const scale = 1.2;
      const drawHeight = height * scale;
      const drawWidth = drawHeight * droppyAspect;
      const drawX = x + (width - drawWidth) / 2;
      const drawY = y + height - drawHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(droppyImage, drawX, drawY, drawWidth, drawHeight);
    } else {
      const body = ctx.createRadialGradient(
        x + width * 0.36,
        y + height * 0.18,
        3,
        x + width * 0.52,
        y + height * 0.6,
        width * 0.68
      );
      body.addColorStop(0, "#fff7c2");
      body.addColorStop(0.56, "#ffd86f");
      body.addColorStop(1, "#f0a830");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.5, y);
      ctx.quadraticCurveTo(x + width, y + height * 0.46, x + width * 0.62, y + height);
      ctx.quadraticCurveTo(x + width * 0.5, y + height * 1.04, x + width * 0.38, y + height);
      ctx.quadraticCurveTo(x, y + height * 0.46, x + width * 0.5, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawObstacle(obstacle) {
    ctx.save();
    const shadowX = obstacle.x + obstacle.width * 0.5;
    const shadowY = world.groundY + 4;
    const shadow = ctx.createRadialGradient(shadowX, shadowY, 2, shadowX, shadowY, obstacle.width * 0.44);
    shadow.addColorStop(0, "rgba(0,0,0,0.22)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, obstacle.width * 0.42, obstacle.width * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    if (obstacle.type === "stone") {
      const stone = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x, obstacle.y + obstacle.height);
      stone.addColorStop(0, "#ecd9b6");
      stone.addColorStop(1, "#bda17d");
      ctx.fillStyle = stone;
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width * 0.1, obstacle.y + obstacle.height * 0.94);
      ctx.lineTo(obstacle.x + obstacle.width * 0.22, obstacle.y + obstacle.height * 0.2);
      ctx.lineTo(obstacle.x + obstacle.width * 0.75, obstacle.y + obstacle.height * 0.08);
      ctx.lineTo(obstacle.x + obstacle.width * 0.96, obstacle.y + obstacle.height * 0.55);
      ctx.lineTo(obstacle.x + obstacle.width * 0.84, obstacle.y + obstacle.height * 0.96);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(120,94,68,0.38)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width * 0.28, obstacle.y + obstacle.height * 0.2);
      ctx.lineTo(obstacle.x + obstacle.width * 0.44, obstacle.y + obstacle.height * 0.82);
      ctx.moveTo(obstacle.x + obstacle.width * 0.62, obstacle.y + obstacle.height * 0.16);
      ctx.lineTo(obstacle.x + obstacle.width * 0.72, obstacle.y + obstacle.height * 0.86);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const stemWidth = obstacle.width * 0.32;
    const stemHeight = obstacle.height * 0.48;
    const stemX = obstacle.x + obstacle.width * 0.5 - stemWidth / 2;
    const stemY = obstacle.y + obstacle.height * 0.48;
    ctx.fillStyle = "#f2e5c9";
    ctx.fillRect(stemX, stemY, stemWidth, stemHeight);

    const cap = ctx.createRadialGradient(
      obstacle.x + obstacle.width * 0.34,
      obstacle.y + obstacle.height * 0.16,
      1,
      obstacle.x + obstacle.width * 0.56,
      obstacle.y + obstacle.height * 0.54,
      obstacle.width
    );
    cap.addColorStop(0, "#ffb39a");
    cap.addColorStop(1, obstacle.hue);
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(
      obstacle.x + obstacle.width * 0.5,
      obstacle.y + obstacle.height * 0.48,
      obstacle.width * 0.54,
      obstacle.height * 0.44,
      obstacle.tilt,
      Math.PI,
      Math.PI * 2
    );
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    obstacle.spots.forEach((spot) => {
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width * spot.x, obstacle.y + obstacle.height * spot.y, obstacle.width * spot.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawPickup(pickup, scoreState) {
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(Math.sin(simNow * 0.006 + pickup.phase) * 0.22 + pickup.tilt);

    if (pickup.kind === "bean") {
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      ctx.beginPath();
      ctx.ellipse(0, pickup.radius * 0.86, pickup.radius * 0.8, pickup.radius * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      const bean = ctx.createLinearGradient(-pickup.radius, -pickup.radius, pickup.radius, pickup.radius);
      bean.addColorStop(0, "#ffe8b9");
      bean.addColorStop(0.52, "#d69a3d");
      bean.addColorStop(1, "#8a4a16");
      ctx.fillStyle = bean;
      ctx.beginPath();
      ctx.ellipse(0, 0, pickup.radius, pickup.radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.54)";
      ctx.lineWidth = Math.max(1.4, pickup.radius * 0.12);
      ctx.beginPath();
      ctx.moveTo(-pickup.radius * 0.18, -pickup.radius * 0.56);
      ctx.quadraticCurveTo(0, 0, pickup.radius * 0.18, pickup.radius * 0.56);
      ctx.stroke();
    } else if (pickup.kind === "adaptogen") {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(0, pickup.radius * 1.06, pickup.radius * 0.76, pickup.radius * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.fillStyle = i % 2 === 0 ? "#f8ffd8" : "#fff4be";
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * pickup.radius * 0.7,
          Math.sin(angle) * pickup.radius * 0.7,
          pickup.radius * 0.46,
          pickup.radius * 0.26,
          angle,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = "#b9de6c";
      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const aura = ctx.createRadialGradient(0, 0, 1, 0, 0, pickup.radius * 2.1);
      aura.addColorStop(0, `rgba(255,255,236,${0.45 + scoreState.flowIntensity * 0.2})`);
      aura.addColorStop(0.45, "rgba(246,255,180,0.25)");
      aura.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f5ffca";
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * pickup.radius * 0.72,
          Math.sin(angle) * pickup.radius * 0.72,
          pickup.radius * 0.45,
          pickup.radius * 0.18,
          angle,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = "#ffe599";
      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw() {
    const snapshot = physics.getSnapshot();
    const scoreState = scoring.getSnapshot();
    ctx.clearRect(0, 0, world.width, world.height);
    background.draw(ctx, world, {
      speed: snapshot.speed,
      flowIntensity: scoreState.flowIntensity,
      environmentProgress: scoreState.environmentProgress,
    });
    drawGround(scoreState.environmentProgress);
    effects.drawLayer(ctx, "back");
    snapshot.pickups.forEach((pickup) => drawPickup(pickup, scoreState));
    snapshot.obstacles.forEach((obstacle) => drawObstacle(obstacle));
    drawRunner(snapshot, scoreState);
    effects.drawLayer(ctx, "front");
  }

  function stepFrame(dt) {
    if (state !== "playing") return;
    simNow += dt * 1000;
    const modifiers = scoring.getModifiers();
    const events = physics.update(dt, modifiers);
    const physicsState = physics.getSnapshot();

    events.forEach((event) => {
      if (event.type === "collect") {
        scoring.applyCollect(event.kind, simNow);
        const scoreState = scoring.getSnapshot();
        effects.spawnCollectBurst(event.x, event.y, event.kind, scoreState.combo, scoreState.flowIntensity);
      } else if (event.type === "landed") {
        effects.spawnLandingDust(event.x, event.y, event.impact);
      } else if (event.type === "hit-obstacle") {
        endGame();
      }
    });

    scoring.update(dt, simNow, physicsState.distance);
    const scoreState = scoring.getSnapshot();
    background.update(dt, {
      speed: physicsState.speed,
      flowIntensity: scoreState.flowIntensity,
      environmentProgress: scoreState.environmentProgress,
    }, world);
    effects.update(dt, {
      runner: physicsState.runner,
      flowIntensity: scoreState.flowIntensity,
    });
    audio.setIntensity(scoreState.flowIntensity * 0.75 + scoreState.environmentProgress * 0.25);
    updateHud();
    draw();
  }

  function loop(now) {
    if (!running || state !== "playing") return;
    const dt = Math.min((now - lastRealNow) / 1000, 0.033);
    lastRealNow = now;
    stepFrame(dt);
    rafId = requestAnimationFrame(loop);
  }

  function showForm(message, tone = "neutral") {
    if (!form) return;
    form.hidden = false;
    if (formNote) {
      formNote.textContent = message;
      formNote.style.color = tone === "error" ? "#995741" : "rgba(51, 49, 44, 0.7)";
    }
  }

  async function submitScore(payload) {
    const res = await fetch(`${API_BASE}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "No se pudo guardar el puntaje.");
    }
    return data;
  }

  async function buildShareImage() {
    const scoreState = scoring.getSnapshot();
    const shareCanvas = document.createElement("canvas");
    shareCanvas.width = 1080;
    shareCanvas.height = 1920;
    const sctx = shareCanvas.getContext("2d");
    if (!sctx) return null;

    const bg = sctx.createLinearGradient(0, 0, 0, shareCanvas.height);
    bg.addColorStop(0, "#dcf7e1");
    bg.addColorStop(0.55, "#f7efb7");
    bg.addColorStop(1, "#ffe4c8");
    sctx.fillStyle = bg;
    sctx.fillRect(0, 0, shareCanvas.width, shareCanvas.height);

    sctx.fillStyle = "rgba(255,255,255,0.5)";
    sctx.beginPath();
    sctx.arc(860, 240, 140, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = "#2f6b56";
    sctx.font = "700 68px 'Montserrat', system-ui, sans-serif";
    sctx.fillText("Droppy Dash", 120, 210);
    sctx.font = "500 42px 'Montserrat', system-ui, sans-serif";
    sctx.fillText("Spring wellness edition", 120, 270);

    sctx.fillStyle = "#2b2a27";
    sctx.font = "800 164px 'Montserrat', system-ui, sans-serif";
    sctx.fillText(String(scoreState.score), 120, 470);
    sctx.font = "600 56px 'Montserrat', system-ui, sans-serif";
    sctx.fillText("Mi score", 120, 540);
    sctx.fillText(`Flow ${scoreState.flowLabel}`, 120, 620);

    if (droppyReady) {
      const targetW = 540;
      const targetH = targetW / droppyAspect;
      sctx.drawImage(droppyImage, 480, 700, targetW, targetH);
    }

    sctx.fillStyle = "#7fc37d";
    sctx.fillRect(0, 1400, shareCanvas.width, 520);
    sctx.fillStyle = "#f8ffe1";
    for (let i = 0; i < 16; i += 1) {
      const x = 70 + i * 62;
      sctx.fillRect(x, 1420, 4, 120);
      sctx.beginPath();
      sctx.arc(x + 2, 1412, 16, 0, Math.PI * 2);
      sctx.fill();
    }

    return new Promise((resolve) => {
      shareCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function shareScoreImage() {
    const blob = await buildShareImage();
    if (!blob) return;
    const scoreState = scoring.getSnapshot();
    const file = new File([blob], "droppy-spring-score.png", { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Droppy Dash",
          text: `Mi score spring wellness: ${scoreState.score}`,
        });
        return;
      } catch (error) {
        // fall through
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "droppy-spring-score.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function formatMonthLabel(monthKey) {
    if (!monthKey) return "Mes en curso";
    const parts = monthKey.split("-").map(Number);
    if (parts.length < 2 || parts.some(Number.isNaN)) return "Mes en curso";
    const [year, month] = parts;
    const date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
    if (Number.isNaN(date.getTime())) return "Mes en curso";
    const formatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
    return `Mes de ${formatter.format(date)}`;
  }

  function formatWeekRange(startStr) {
    if (!startStr) return "Semana en curso";
    const parts = startStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return "Semana en curso";
    const [year, month, day] = parts;
    const start = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(start.getTime())) return "Semana en curso";
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const formatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
    const startParts = formatter.formatToParts(start);
    const endParts = formatter.formatToParts(end);
    const pick = (items, type) => items.find((part) => part.type === type)?.value || "";
    const startDay = pick(startParts, "day");
    const startMonth = pick(startParts, "month");
    const endDay = pick(endParts, "day");
    const endMonth = pick(endParts, "month");
    return startMonth === endMonth ? `${startDay}-${endDay} ${endMonth}` : `${startDay} ${startMonth}-${endDay} ${endMonth}`;
  }

  function setActivePeriod(period) {
    currentPeriod = period;
    if (leaderboardCard) leaderboardCard.dataset.periodView = period;
    filterButtons.forEach((button) => {
      const isActive = button.dataset.period === period;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function getPeriodOffset(period = currentPeriod) {
    return Number.isFinite(periodOffsets[period]) ? periodOffsets[period] : 0;
  }

  function setPeriodOffset(period, value) {
    if (!(period in periodOffsets)) return;
    periodOffsets[period] = Math.min(value, 0);
  }

  function updatePeriodNav(period = currentPeriod) {
    if (!periodPrevBtn || !periodNextBtn) return;
    const isActive = period === "weekly" || period === "monthly";
    periodPrevBtn.hidden = !isActive;
    periodNextBtn.hidden = !isActive;
    if (!isActive) return;
    const offset = getPeriodOffset(period);
    const prevLabel = period === "monthly" ? "Mes anterior" : "Semana anterior";
    const nextLabel = period === "monthly" ? "Mes siguiente" : "Semana siguiente";
    periodPrevBtn.disabled = false;
    periodNextBtn.disabled = offset >= 0;
    periodPrevBtn.title = prevLabel;
    periodNextBtn.title = nextLabel;
    periodPrevBtn.setAttribute("aria-label", prevLabel);
    periodNextBtn.setAttribute("aria-label", nextLabel);
  }

  async function fetchLeaderboard(period = currentPeriod, focusId, offset = getPeriodOffset(period)) {
    if (!leaderboardList) return;
    if (isLocalPreview) {
      leaderboardList.innerHTML = '<li class="droppy__leaderboard-empty">Leaderboard disponible en entorno con API.</li>';
      if (periodLabelEl) periodLabelEl.textContent = "Preview local";
      if (rankEl) rankEl.textContent = "";
      if (leaderboardToggle) leaderboardToggle.hidden = true;
      updatePeriodNav(period);
      return;
    }
    leaderboardList.innerHTML = '<li class="droppy__leaderboard-empty">Cargando leaderboard...</li>';
    updatePeriodNav(period);
    try {
      const url = new URL(`${API_BASE}/leaderboard`, window.location.origin);
      url.searchParams.set("period", period);
      url.searchParams.set("limit", showTopTen ? "10" : "3");
      if (focusId) url.searchParams.set("entryId", focusId);
      if (period === "weekly" || period === "monthly") {
        url.searchParams.set("offset", String(offset));
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("leaderboard");
      const data = await res.json();
      lastLeaderboardData = data;
      renderLeaderboard(data);
    } catch (error) {
      leaderboardList.innerHTML = '<li class="droppy__leaderboard-empty">No se pudo cargar el leaderboard.</li>';
    }
  }

  function renderLeaderboard(data) {
    if (!leaderboardList) return;
    const entries = Array.isArray(data.entries) ? data.entries : [];
    leaderboardList.innerHTML = "";
    const period = data.period || currentPeriod;
    const periodStart = data.periodStart || "";
    const visibleEntries = showTopTen ? entries.slice(0, 10) : entries.slice(0, 3);

    if (!visibleEntries.length) {
      leaderboardList.innerHTML = `<li class="droppy__leaderboard-empty">${
        period === "monthly"
          ? "Aun no hay scores este mes."
          : period === "all"
            ? "Aun no hay scores registrados."
            : "Aun no hay scores esta semana."
      }</li>`;
    } else {
      visibleEntries.forEach((entry, index) => {
        const item = document.createElement("li");
        item.className = "droppy__leaderboard-item";
        const name = document.createElement("span");
        name.textContent = `${index + 1}. ${entry.name}`;
        const value = document.createElement("span");
        value.textContent = String(entry.score);
        item.append(name, value);
        leaderboardList.appendChild(item);
      });
    }

    if (periodLabelEl) {
      periodLabelEl.textContent = period === "monthly"
        ? formatMonthLabel(periodStart)
        : period === "all"
          ? "Historico"
          : formatWeekRange(periodStart);
    }

    if (leaderboardToggle) {
      const canToggle = entries.length > 3;
      leaderboardToggle.hidden = !canToggle;
      leaderboardToggle.textContent = showTopTen ? "Ver top 3" : "Ver top 10";
      leaderboardToggle.setAttribute("aria-expanded", String(showTopTen));
    }

    if (rankEl) {
      rankEl.textContent = data.userRank ? `Tu posicion: #${data.userRank}` : "";
    }
    updatePeriodNav(period);
  }

  function onFormSubmit(event) {
    event.preventDefault();
    if (!form) return;
    if (!sessionToken) {
      showForm("Necesitas conexion para guardar tu puntaje.", "error");
      return;
    }
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const contact = String(formData.get("contact") || "").trim();
    if (!name) {
      showForm("Ingresa tu nombre.", "error");
      return;
    }
    if (!contact) {
      showForm("Ingresa tu Instagram o telefono.", "error");
      return;
    }

    const scoreState = scoring.getSnapshot();
    const payload = {
      token: sessionToken,
      name,
      contact,
      score: scoreState.score,
      distance: Math.round(scoreState.distance),
      collectibles: scoreState.collected,
      maxCombo: scoreState.maxCombo,
      durationMs: Math.max(1, Math.round(performance.now() - gameStart)),
    };

    showForm("Enviando puntaje...");
    submitScore(payload)
      .then((data) => {
        entryId = data.entryId || null;
        showForm("Puntaje guardado. Suerte.", "neutral");
        form.reset();
        fetchLeaderboard(currentPeriod, entryId);
      })
      .catch((error) => {
        showForm(error.message || "No se pudo guardar el puntaje.", "error");
      });
  }

  function renderGameToText() {
    const physicsState = physics.getSnapshot();
    const scoreState = scoring.getSnapshot();
    const payload = {
      coordinates: "origin: top-left, +x right, +y down",
      mode: state,
      player: {
        x: Math.round(physicsState.runner.x),
        y: Math.round(physicsState.runner.y),
        width: Math.round(physicsState.runner.width),
        height: Math.round(physicsState.runner.height),
        vy: Number(physicsState.runner.velY.toFixed(2)),
        grounded: physicsState.runner.isGrounded,
      },
      obstacles: physicsState.obstacles.map((obstacle) => ({
        type: obstacle.type,
        x: Math.round(obstacle.x),
        y: Math.round(obstacle.y),
        width: Math.round(obstacle.width),
        height: Math.round(obstacle.height),
      })),
      pickups: physicsState.pickups.map((pickup) => ({
        kind: pickup.kind,
        x: Math.round(pickup.x),
        y: Math.round(pickup.y),
        radius: Math.round(pickup.radius),
      })),
      speed: Number(physicsState.speed.toFixed(2)),
      distance: Math.round(scoreState.distance),
      score: scoreState.score,
      combo: scoreState.combo,
      flowIntensity: Number(scoreState.flowIntensity.toFixed(2)),
      environment: scoreState.environmentProgress < 0.45 ? "morning" : scoreState.environmentProgress < 0.8 ? "golden" : "afternoon",
    };
    return JSON.stringify(payload);
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    const total = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < total; i += 1) {
      stepFrame(1 / 60);
    }
    draw();
  };

  function initEvents() {
    playBtn?.addEventListener("click", startGame);
    retryBtn?.addEventListener("click", startGame);
    form?.addEventListener("submit", onFormSubmit);
    shareBtn?.addEventListener("click", shareScoreImage);
    pauseBtn?.addEventListener("click", () => {
      if (state === "playing") pauseGame();
      else if (state === "paused") resumeGame();
    });
    resumeBtn?.addEventListener("click", resumeGame);
    restartBtn?.addEventListener("click", startGame);
    leaderboardToggle?.addEventListener("click", () => {
      showTopTen = !showTopTen;
      fetchLeaderboard(currentPeriod, entryId || undefined);
    });
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const period = button.dataset.period || "weekly";
        if (period === currentPeriod) return;
        setPeriodOffset(period, 0);
        setActivePeriod(period);
        fetchLeaderboard(currentPeriod);
      });
    });
    periodPrevBtn?.addEventListener("click", () => {
      if (currentPeriod !== "weekly" && currentPeriod !== "monthly") return;
      setPeriodOffset(currentPeriod, getPeriodOffset(currentPeriod) - 1);
      fetchLeaderboard(currentPeriod, entryId || undefined);
    });
    periodNextBtn?.addEventListener("click", () => {
      if (currentPeriod !== "weekly" && currentPeriod !== "monthly") return;
      const offset = getPeriodOffset(currentPeriod);
      if (offset >= 0) return;
      setPeriodOffset(currentPeriod, offset + 1);
      fetchLeaderboard(currentPeriod, entryId || undefined);
    });
    canvas.addEventListener("pointerdown", (event) => {
      if (state === "playing") {
        event.preventDefault();
        jump();
      }
    });
    window.addEventListener("keydown", (event) => {
      const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea") return;

      if (event.code === "KeyF") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if (event.code === "Escape" && root.classList.contains("droppy--fullscreen")) {
        event.preventDefault();
        setFullscreenMode(false);
        if (state === "playing") pauseGame();
        return;
      }

      if (event.code === "KeyP") {
        event.preventDefault();
        if (state === "playing") pauseGame();
        else if (state === "paused") resumeGame();
        return;
      }

      if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
        if (state !== "playing" || event.repeat) return;
        event.preventDefault();
        jump();
      }
    });
    window.addEventListener("resize", resizeCanvas);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(canvas);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state === "playing") pauseGame();
    });
  }

  resizeCanvas();
  initEvents();
  setOverlay("start");
  if (pauseBtn) pauseBtn.disabled = true;
  setActivePeriod("weekly");
  setPeriodOffset("weekly", 0);
  updatePeriodNav("weekly");
  fetchLeaderboard("weekly");
  draw();
})();
