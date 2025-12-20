(() => {
  const root = document.querySelector("[data-droppy]");
  if (!root) return;

  const canvas = root.querySelector("#droppy-canvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const scoreEl = root.querySelector("[data-score]");
  const comboEl = root.querySelector("[data-combo]");
  const finalScoreEl = root.querySelector("[data-final-score]");
  const overlayStart = root.querySelector('[data-overlay="start"]');
  const overlayGameover = root.querySelector('[data-overlay="gameover"]');
  const playBtn = root.querySelector("[data-play]");
  const retryBtn = root.querySelector(".droppy__retry");
  const saveBtn = root.querySelector(".droppy__save");
  const form = root.querySelector("[data-form]");
  const formNote = root.querySelector("[data-form-note]");
  const leaderboardList = root.querySelector("[data-leaderboard]");
  const periodLabelEl = root.querySelector("[data-period-label]");
  const filterButtons = Array.from(root.querySelectorAll("[data-period]"));
  const rankEl = root.querySelector("[data-rank]");
  const jumpBtn = root.querySelector(".droppy__jump");
  const connectionEl = root.querySelector("[data-connection]");

  const API_BASE = "/api";
  const MAX_COMBO = 5;
  const COMBO_WINDOW_MS = 2400;
  const DISTANCE_SCALE = 12;
  const BASE_SPEED = 260;
  const SPEED_RAMP = 6.5;
  const MAX_SPEED = 560;

  const world = {
    width: 0,
    height: 0,
    groundY: 0,
    runner: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      velY: 0,
      gravity: 0,
      jumpStrength: 0,
      jumpCount: 0,
    },
  };

  let obstacles = [];
  let collectibles = [];
  let clouds = [];
  let skyLights = [];
  let bgOffset = 0;
  let midOffset = 0;
  let forestOffset = 0;
  let fieldOffset = 0;
  let groundOffset = 0;

  let state = "idle";
  let running = false;
  let lastTime = 0;
  let gameStart = 0;
  let gameTime = 0;

  let speed = BASE_SPEED;
  let distance = 0;
  let score = 0;
  let combo = 1;
  let comboScore = 0;
  let maxCombo = 1;
  let collected = 0;
  let lastCollectAt = 0;

  let obstacleTimer = 0;
  let collectibleTimer = 0;

  let sessionToken = null;
  let sessionSeed = Date.now();
  let entryId = null;

  let lastScoreRendered = -1;
  let lastComboRendered = -1;
  let skyGradient = null;
  const droppyImage = new Image();
  let droppyReady = false;
  let droppyAspect = 1;
  let currentPeriod = "weekly";

  droppyImage.onload = () => {
    droppyReady = true;
    droppyAspect = droppyImage.naturalWidth / droppyImage.naturalHeight || 1;
  };
  droppyImage.src = "assets/droppy.png";

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  let rng = mulberry32(sessionSeed);

  function rand(min, max) {
    return min + (max - min) * rng();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    world.width = rect.width;
    world.height = rect.height;
    world.groundY = rect.height * 0.82;

    const runnerWidth = clamp(rect.width * 0.12, 32, 54);
    world.runner.width = runnerWidth;
    world.runner.height = runnerWidth * 1.25;
    world.runner.x = rect.width * 0.22;
    world.runner.y = world.groundY - world.runner.height;
    world.runner.velY = 0;
    world.runner.jumpCount = 0;
    world.runner.gravity = rect.height * 1.9;
    world.runner.jumpStrength = rect.height * 0.95;

    skyGradient = ctx.createLinearGradient(0, 0, 0, world.height);
    skyGradient.addColorStop(0, "#dfefff");
    skyGradient.addColorStop(0.55, "#f7fbff");
    skyGradient.addColorStop(1, "#fff4da");

    buildClouds();
    buildSkyLights();
  }

  function buildClouds() {
    clouds = Array.from({ length: 6 }).map((_, i) => ({
      x: rand(0, world.width),
      y: rand(30, world.height * 0.35),
      scale: rand(0.6, 1.2),
      speed: rand(6, 14),
      id: i,
    }));
  }

  function buildSkyLights() {
    skyLights = Array.from({ length: 12 }).map(() => ({
      x: Math.random() * world.width,
      y: Math.random() * world.height * 0.35 + 16,
      r: 1.2 + Math.random() * 2.4,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function resetGame() {
    obstacles = [];
    collectibles = [];
    distance = 0;
    score = 0;
    combo = 1;
    comboScore = 0;
    maxCombo = 1;
    collected = 0;
    lastCollectAt = 0;
    speed = BASE_SPEED;
    gameTime = 0;

    obstacleTimer = 1;
    collectibleTimer = 1.2;
    bgOffset = 0;
    midOffset = 0;
    forestOffset = 0;
    fieldOffset = 0;
    groundOffset = 0;
    buildClouds();

    world.runner.y = world.groundY - world.runner.height;
    world.runner.velY = 0;
    world.runner.jumpCount = 0;

    lastScoreRendered = -1;
    lastComboRendered = -1;
    updateHud();
  }

  function setOverlay(stateName) {
    if (overlayStart) overlayStart.hidden = stateName !== "start";
    if (overlayGameover) overlayGameover.hidden = stateName !== "gameover";
  }

  function setConnectionNote(message) {
    if (!connectionEl) return;
    connectionEl.textContent = message;
  }

  async function requestSession() {
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
    } catch (err) {
      sessionToken = null;
      rng = mulberry32(Date.now());
      setConnectionNote("Sin conexión: podrás jugar, pero no guardar puntaje.");
      return null;
    }
  }

  function startGame() {
    if (state === "playing") return;
    state = "loading";
    setOverlay("start");
    if (playBtn) playBtn.disabled = true;
    if (retryBtn) retryBtn.disabled = true;
    requestSession().finally(() => {
      resetGame();
      state = "playing";
      running = true;
      gameStart = performance.now();
      lastTime = gameStart;
      if (playBtn) playBtn.disabled = false;
      if (retryBtn) retryBtn.disabled = false;
      if (overlayStart) overlayStart.hidden = true;
      if (overlayGameover) overlayGameover.hidden = true;
      if (form) form.hidden = true;
      if (saveBtn) saveBtn.disabled = false;
      entryId = null;
      requestAnimationFrame(loop);
    });
  }

  function endGame() {
    state = "gameover";
    running = false;
    setOverlay("gameover");
    if (finalScoreEl) finalScoreEl.textContent = String(score);
  }

  function jump() {
    if (state !== "playing") return;
    if (world.runner.jumpCount >= 2) return;
    const jumpScale = world.runner.jumpCount === 0 ? 1 : 0.88;
    world.runner.velY = -world.runner.jumpStrength * jumpScale;
    world.runner.jumpCount += 1;
  }

  function spawnObstacle() {
    const baseSize = clamp(world.width * 0.12, 30, 58);
    const width = baseSize * rand(0.9, 1.2);
    const height = baseSize * rand(0.85, 1.35);
    const capColor = rng() > 0.6 ? "#e5533c" : "#d4472b";
    const spots = Array.from({ length: Math.round(rand(2, 4)) }).map(() => ({
      x: rand(0.22, 0.78),
      y: rand(0.12, 0.45),
      r: rand(0.06, 0.12),
    }));

    obstacles.push({
      x: world.width + rand(0, world.width * 0.3),
      y: world.groundY - height,
      w: width,
      h: height,
      type: "mushroom",
      capColor,
      spots,
      tilt: rand(-0.08, 0.08),
    });

    const minGap = clamp(1.2 - gameTime * 0.02, 0.7, 1.2);
    const maxGap = clamp(1.9 - gameTime * 0.02, 1.1, 1.9);
    obstacleTimer = rand(minGap, maxGap);
  }

  function spawnCollectible() {
    const size = clamp(world.width * 0.06, 16, 26);
    const lift = rand(90, 180);
    const baseY = world.groundY - lift;
    collectibles.push({
      x: world.width + rand(40, world.width * 0.4),
      y: baseY,
      baseY,
      r: size * 0.5,
      bob: rand(6, 12),
      phase: rand(0, Math.PI * 2),
      tilt: rand(-0.3, 0.3),
    });

    const minGap = clamp(1.2 - gameTime * 0.015, 0.7, 1.2);
    const maxGap = clamp(2.1 - gameTime * 0.02, 1.1, 2.1);
    collectibleTimer = rand(minGap, maxGap);
  }

  function checkCollision(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function updateHud() {
    if (scoreEl && score !== lastScoreRendered) {
      scoreEl.textContent = String(score);
      lastScoreRendered = score;
    }
    if (comboEl && combo !== lastComboRendered) {
      comboEl.textContent = `x${combo}`;
      pulseElement(comboEl);
      lastComboRendered = combo;
    }
  }

  function pulseElement(el) {
    if (!el) return;
    el.classList.remove("is-pulse");
    void el.offsetWidth;
    el.classList.add("is-pulse");
  }

  function updateGame(dt, now) {
    if (state !== "playing") return;
    gameTime += dt;
    speed = Math.min(BASE_SPEED + gameTime * SPEED_RAMP, MAX_SPEED);
    distance += (speed * dt) / DISTANCE_SCALE;

    const runner = world.runner;
    runner.velY += runner.gravity * dt;
    runner.y += runner.velY * dt;
    if (runner.y >= world.groundY - runner.height) {
      runner.y = world.groundY - runner.height;
      runner.velY = 0;
      runner.jumpCount = 0;
    }

    bgOffset += speed * dt * 0.05;
    midOffset += speed * dt * 0.1;
    forestOffset += speed * dt * 0.14;
    fieldOffset += speed * dt * 0.2;
    groundOffset += speed * dt * 0.3;

    obstacleTimer -= dt;
    if (obstacleTimer <= 0) spawnObstacle();

    collectibleTimer -= dt;
    if (collectibleTimer <= 0) spawnCollectible();

    obstacles.forEach((obs) => {
      obs.x -= speed * dt;
    });
    collectibles.forEach((bean) => {
      bean.x -= speed * dt;
      bean.y = bean.baseY + Math.sin(gameTime * 3 + bean.phase) * bean.bob;
    });
    clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -80) {
        cloud.x = world.width + rand(30, 120);
        cloud.y = rand(30, world.height * 0.35);
        cloud.scale = rand(0.6, 1.2);
        cloud.speed = rand(6, 14);
      }
    });

    obstacles = obstacles.filter((obs) => obs.x + obs.w > -80);
    collectibles = collectibles.filter((bean) => bean.x + bean.r > -40);

    const hitboxPaddingX = runner.width * 0.18;
    const hitboxPaddingY = runner.height * 0.12;
    const runnerRect = {
      x: runner.x + hitboxPaddingX,
      y: runner.y + hitboxPaddingY,
      w: runner.width - hitboxPaddingX * 2,
      h: runner.height - hitboxPaddingY * 1.2,
    };

    for (const obs of obstacles) {
      const obsRect = {
        x: obs.x + obs.w * 0.08,
        y: obs.y + obs.h * 0.08,
        w: obs.w * 0.84,
        h: obs.h * 0.92,
      };
      if (checkCollision(runnerRect, obsRect)) {
        endGame();
        return;
      }
    }

    for (let i = collectibles.length - 1; i >= 0; i -= 1) {
      const bean = collectibles[i];
      const cx = bean.x;
      const cy = bean.y;
      const nearestX = clamp(cx, runnerRect.x, runnerRect.x + runnerRect.w);
      const nearestY = clamp(cy, runnerRect.y, runnerRect.y + runnerRect.h);
      const dx = cx - nearestX;
      const dy = cy - nearestY;
      if (dx * dx + dy * dy < bean.r * bean.r) {
        collectibles.splice(i, 1);
        collected += 1;
        if (now - lastCollectAt < COMBO_WINDOW_MS) {
          combo = Math.min(combo + 1, MAX_COMBO);
        } else {
          combo = 1;
        }
        maxCombo = Math.max(maxCombo, combo);
        comboScore += combo;
        lastCollectAt = now;
      }
    }

    if (lastCollectAt && now - lastCollectAt > COMBO_WINDOW_MS * 1.3) {
      combo = 1;
    }

    score = Math.max(0, Math.floor(distance) + comboScore);
    updateHud();
  }

  function drawBackground() {
    drawSky();
    drawSun();
    drawSkyLights();
    drawClouds();
    drawMountains(bgOffset * 0.18, world.height * 0.52, world.width * 0.22, "#b9cbe4", 3.5);
    drawMountains(bgOffset * 0.32, world.height * 0.6, world.width * 0.2, "#a9bedc", 1.8);
    drawForest(forestOffset * 0.6, world.height * 0.68);
    drawCoffeeFields(fieldOffset * 0.8, world.height * 0.75);
  }

  function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
    gradient.addColorStop(0, "#86d0ff");
    gradient.addColorStop(0.45, "#dff5ff");
    gradient.addColorStop(1, "#fff2c4");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, world.width, world.height);
  }

  function drawSun() {
    const x = world.width * 0.78;
    const y = world.height * 0.16;
    const radius = world.width * 0.1;
    const glow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 2.4);
    glow.addColorStop(0, "rgba(255, 236, 167, 0.9)");
    glow.addColorStop(0.5, "rgba(255, 226, 140, 0.38)");
    glow.addColorStop(1, "rgba(255, 221, 128, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe7a2";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSkyLights() {
    const t = gameTime;
    skyLights.forEach((light) => {
      const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + light.phase);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + twinkle * 0.4})`;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.r * (0.7 + twinkle * 0.6), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawMountains(offset, baseY, size, color, blur = 0) {
    ctx.save();
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = color;
    const step = size * 1.1;
    const startX = -step + (offset % step);
    for (let x = startX, index = 0; x < world.width + step; x += step, index += 1) {
      const peak = size * (0.65 + 0.25 * Math.sin(index * 0.8));
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + step * 0.5, baseY - peak);
      ctx.lineTo(x + step, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawForest(offset, baseY) {
    const spacing = 34;
    const startX = -spacing + (offset % spacing);
    for (let x = startX, index = 0; x < world.width + spacing; x += spacing, index += 1) {
      const treeH = world.height * (0.12 + 0.02 * Math.sin(index * 0.6));
      const treeW = treeH * 0.6;
      const y = baseY - treeH;
      ctx.fillStyle = index % 2 === 0 ? "#2f6b3a" : "#3a7a46";
      ctx.beginPath();
      ctx.moveTo(x, baseY + 4);
      ctx.lineTo(x + treeW * 0.5, y);
      ctx.lineTo(x + treeW, baseY + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCoffeeFields(offset, baseY) {
    const rowCount = 4;
    const rowHeight = world.height * 0.055;
    const fieldColors = ["#7fc46c", "#6bb45f", "#5aa652", "#4f9948"];

    for (let row = 0; row < rowCount; row += 1) {
      const y = baseY + row * rowHeight;
      ctx.fillStyle = fieldColors[row % fieldColors.length];
      ctx.fillRect(0, y, world.width, rowHeight + 1);

      const spacing = Math.max(30, 70 - row * 8);
      const shift = (offset * (0.5 + row * 0.12)) % spacing;
      const bushY = y + rowHeight * 0.52;
      const bushR = Math.max(3, 8 - row);

      for (let x = -shift; x < world.width + spacing; x += spacing) {
        ctx.fillStyle = "#2f6b3a";
        ctx.beginPath();
        ctx.arc(x, bushY, bushR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b5332c";
        ctx.beginPath();
        ctx.arc(x + bushR * 0.4, bushY - bushR * 0.2, bushR * 0.3, 0, Math.PI * 2);
        ctx.arc(x - bushR * 0.2, bushY + bushR * 0.1, bushR * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawClouds() {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    clouds.forEach((cloud) => {
      const x = cloud.x;
      const y = cloud.y;
      const s = cloud.scale * 22;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.arc(x + s * 0.8, y + s * 0.2, s * 0.8, 0, Math.PI * 2);
      ctx.arc(x + s * 1.4, y, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawGround() {
    ctx.fillStyle = "#7fca6f";
    ctx.fillRect(0, world.groundY - 10, world.width, 12);
    ctx.fillStyle = "#6ab15b";
    for (let x = -groundOffset % 24; x < world.width + 24; x += 24) {
      ctx.fillRect(x, world.groundY - 6, 12, 3);
    }

    ctx.fillStyle = "#d7b385";
    ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);

    ctx.fillStyle = "rgba(120, 84, 46, 0.22)";
    for (let x = -groundOffset % 32; x < world.width + 32; x += 32) {
      ctx.fillRect(x, world.groundY + 12, 12, 4);
    }
  }

  function drawRunner() {
    const runner = world.runner;
    const x = runner.x;
    const y = runner.y;
    const w = runner.width;
    const h = runner.height;

    const onGround = runner.y >= world.groundY - runner.height - 0.5;
    const vel = runner.velY;
    const stretch = vel < -80 ? 1.1 : vel > 120 ? 0.92 : 1;
    const squash = vel > 120 ? 1.12 : vel < -80 ? 0.95 : 1;
    const bounce = onGround ? Math.sin(gameTime * 12) * 0.03 : 0;
    const scaleY = stretch + bounce;
    const scaleX = squash - bounce * 0.6;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, world.groundY + 6, w * 0.32, w * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    const originX = x + w * 0.5;
    const originY = y + h * 0.82;
    ctx.translate(originX, originY);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-originX, -originY);

    if (droppyReady) {
      const scale = 1.22;
      const drawHeight = h * scale;
      const drawWidth = drawHeight * droppyAspect;
      const drawX = x + (w - drawWidth) / 2;
      const drawY = y + h - drawHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(droppyImage, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
      return;
    }

    const bodyGrad = ctx.createRadialGradient(
      x + w * 0.4,
      y + h * 0.2,
      w * 0.12,
      x + w * 0.5,
      y + h * 0.55,
      w * 0.6
    );
    bodyGrad.addColorStop(0, "#fff0a0");
    bodyGrad.addColorStop(0.55, "#ffd54d");
    bodyGrad.addColorStop(1, "#f2a41b");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y);
    ctx.quadraticCurveTo(x + w, y + h * 0.45, x + w * 0.6, y + h);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 1.05, x + w * 0.4, y + h);
    ctx.quadraticCurveTo(x, y + h * 0.45, x + w * 0.5, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.68, y + h * 0.32, w * 0.15, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + w * 0.42, y + h * 0.5, w * 0.11, 0, Math.PI * 2);
    ctx.arc(x + w * 0.62, y + h * 0.5, w * 0.11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#231f20";
    ctx.beginPath();
    ctx.arc(x + w * 0.44, y + h * 0.52, w * 0.05, 0, Math.PI * 2);
    ctx.arc(x + w * 0.64, y + h * 0.52, w * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e24a3b";
    ctx.beginPath();
    ctx.arc(x + w * 0.53, y + h * 0.66, w * 0.07, 0, Math.PI);
    ctx.fill();

    ctx.strokeStyle = "#231f20";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.37, y + h * 0.8);
    ctx.lineTo(x + w * 0.28, y + h * 0.95);
    ctx.moveTo(x + w * 0.63, y + h * 0.82);
    ctx.lineTo(x + w * 0.75, y + h * 0.96);
    ctx.stroke();

    ctx.restore();
  }

  function drawObstacle(obs) {
    ctx.save();
    const stemW = obs.w * 0.36;
    const stemH = obs.h * 0.5;
    const stemX = obs.x + obs.w * 0.5 - stemW / 2;
    const stemY = obs.y + obs.h * 0.45;

    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.beginPath();
    ctx.ellipse(obs.x + obs.w * 0.5, world.groundY + 4, obs.w * 0.35, obs.w * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f1dfc2";
    ctx.fillRect(stemX, stemY, stemW, stemH);

    const capGrad = ctx.createRadialGradient(
      obs.x + obs.w * 0.35,
      obs.y + obs.h * 0.22,
      2,
      obs.x + obs.w * 0.55,
      obs.y + obs.h * 0.55,
      obs.w
    );
    capGrad.addColorStop(0, "#ff8366");
    capGrad.addColorStop(1, obs.capColor || "#d4472b");
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.ellipse(obs.x + obs.w * 0.5, obs.y + obs.h * 0.48, obs.w * 0.52, obs.h * 0.45, obs.tilt || 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    (obs.spots || []).forEach((spot) => {
      ctx.beginPath();
      ctx.arc(obs.x + obs.w * spot.x, obs.y + obs.h * spot.y, obs.w * spot.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = "rgba(92, 44, 34, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(obs.x + obs.w * 0.35, stemY + stemH * 0.15);
    ctx.lineTo(obs.x + obs.w * 0.45, stemY + stemH * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  function drawCollectible(bean) {
    const tilt = Math.sin(gameTime * 3 + bean.phase) * 0.25 + (bean.tilt || 0);
    const grad = ctx.createRadialGradient(
      bean.x - bean.r * 0.3,
      bean.y - bean.r * 0.3,
      2,
      bean.x,
      bean.y,
      bean.r * 1.2
    );
    grad.addColorStop(0, "#ffe3a1");
    grad.addColorStop(0.55, "#f1a82e");
    grad.addColorStop(1, "#a65b17");
    ctx.save();
    ctx.translate(bean.x, bean.y);
    ctx.rotate(tilt);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bean.r, bean.r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-bean.r * 0.15, -bean.r * 0.5);
    ctx.lineTo(bean.r * 0.25, bean.r * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, world.width, world.height);
    drawBackground();
    drawGround();

    collectibles.forEach((bean) => drawCollectible(bean));
    obstacles.forEach((obs) => drawObstacle(obs));
    drawRunner();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    updateGame(dt, now);
    draw();
    requestAnimationFrame(loop);
  }

  function showForm(message, tone = "neutral") {
    if (!form) return;
    form.hidden = false;
    if (formNote) {
      formNote.textContent = message;
      formNote.style.color = tone === "error" ? "#a6322c" : "rgba(35, 31, 32, 0.7)";
    }
  }

  function hideForm() {
    if (!form) return;
    form.hidden = true;
    if (formNote) formNote.textContent = "";
  }

  async function submitScore(payload) {
    const res = await fetch(`${API_BASE}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data.error || "No se pudo guardar el puntaje.";
      throw new Error(message);
    }
    return data;
  }

  function setActivePeriod(period) {
    currentPeriod = period;
    filterButtons.forEach((button) => {
      const isActive = button.dataset.period === period;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  async function fetchLeaderboard(period = currentPeriod, focusId) {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '<li class="droppy__leaderboard-empty">Cargando leaderboard...</li>';

    try {
      const url = new URL(`${API_BASE}/leaderboard`, window.location.origin);
      if (period) url.searchParams.set("period", period);
      if (focusId) url.searchParams.set("entryId", focusId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("leaderboard");
      const data = await res.json();
      renderLeaderboard(data);
    } catch (err) {
      leaderboardList.innerHTML = '<li class="droppy__leaderboard-empty">No se pudo cargar el leaderboard.</li>';
    }
  }

  function renderLeaderboard(data) {
    if (!leaderboardList) return;
    const entries = Array.isArray(data.entries) ? data.entries : [];
    leaderboardList.innerHTML = "";
    const period = data.period || currentPeriod;
    const periodStart = data.periodStart || "";

    if (!entries.length) {
      const emptyText =
        period === "monthly"
          ? "Aún no hay scores este mes."
          : period === "all"
          ? "Aún no hay scores registrados."
          : "Aún no hay scores esta semana.";
      leaderboardList.innerHTML = `<li class="droppy__leaderboard-empty">${emptyText}</li>`;
    } else {
      entries.forEach((entry, index) => {
        const li = document.createElement("li");
        li.className = "droppy__leaderboard-item";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = `${index + 1}. ${entry.name}`;
        const scoreSpan = document.createElement("span");
        scoreSpan.textContent = String(entry.score);
        li.append(nameSpan, scoreSpan);
        leaderboardList.appendChild(li);
      });
    }

    if (periodLabelEl) {
      if (period === "monthly") {
        periodLabelEl.textContent = periodStart ? `Mes de ${periodStart.slice(0, 7)}` : "Mes en curso";
      } else if (period === "all") {
        periodLabelEl.textContent = "Histórico";
      } else {
        periodLabelEl.textContent = periodStart ? `Semana del ${periodStart}` : "Semana en curso";
      }
    }

    if (rankEl) {
      if (data.userRank) {
        rankEl.textContent = `Tu posición: #${data.userRank}`;
      } else {
        rankEl.textContent = "";
      }
    }
  }

  function onFormSubmit(event) {
    event.preventDefault();
    if (!form) return;
    if (!sessionToken) {
      showForm("Necesitas conexión para guardar tu puntaje.", "error");
      return;
    }
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    if (!name) {
      showForm("Ingresa tu nombre o @instagram.", "error");
      return;
    }

    const durationMs = Math.max(1, Math.round(performance.now() - gameStart));
    const payload = {
      token: sessionToken,
      name,
      phone,
      score,
      distance: Math.round(distance),
      collectibles: collected,
      maxCombo,
      durationMs,
    };

    if (saveBtn) saveBtn.disabled = true;
    showForm("Enviando puntaje...");

    submitScore(payload)
      .then((data) => {
        entryId = data.entryId || null;
        showForm("Puntaje guardado. ¡Suerte!", "neutral");
        if (form) form.reset();
        fetchLeaderboard(currentPeriod, entryId);
      })
      .catch((err) => {
        showForm(err.message || "No se pudo guardar el puntaje.", "error");
      })
      .finally(() => {
        if (saveBtn) saveBtn.disabled = false;
      });
  }

  function initEvents() {
    playBtn?.addEventListener("click", startGame);
    retryBtn?.addEventListener("click", startGame);
    saveBtn?.addEventListener("click", () => {
      if (form?.hidden) {
        showForm("Ingresa tus datos para el leaderboard.");
      } else {
        hideForm();
      }
    });
    form?.addEventListener("submit", onFormSubmit);
    jumpBtn?.addEventListener("click", jump);
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const period = button.dataset.period || "weekly";
        if (period === currentPeriod) return;
        setActivePeriod(period);
        fetchLeaderboard(currentPeriod);
      });
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
  }

  resizeCanvas();
  initEvents();
  setOverlay("start");
  setActivePeriod("weekly");
  fetchLeaderboard("weekly");
})();
