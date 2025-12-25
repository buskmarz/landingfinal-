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
  const form = root.querySelector("[data-form]");
  const formNote = root.querySelector("[data-form-note]");
  const leaderboardList = root.querySelector("[data-leaderboard]");
  const periodLabelEl = root.querySelector("[data-period-label]");
  const filterButtons = Array.from(root.querySelectorAll("[data-period]"));
  const rankEl = root.querySelector("[data-rank]");
  const jumpBtn = root.querySelector(".droppy__jump");
  const connectionEl = root.querySelector("[data-connection]");
  const shareBtn = root.querySelector(".droppy__share");
  const pauseBtn = root.querySelector(".droppy__pause");
  const resumeBtn = root.querySelector(".droppy__resume");
  const restartBtn = root.querySelector(".droppy__restart");
  const overlayPause = root.querySelector('[data-overlay="pause"]');
  const canvasFrame = root.querySelector(".droppy__canvas-frame");

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
  let particles = [];
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
  let wasOnGround = true;
  const forestLayers = {
    bg: { src: "assets/bg_treeline.png", img: new Image(), ready: false },
    mg: { src: "assets/mg_trees.png", img: new Image(), ready: false },
    fg: { src: "assets/fg_trees.png", img: new Image(), ready: false },
  };
  const forestConfig = {
    bg: { scroll: 0.16, y: 0.72, opacity: 0.75, heightRatio: 0.34 },
    mg: { scroll: 0.28, y: 0.72, opacity: 0.85, heightRatio: 0.4 },
    fg: { scroll: 0.46, y: 0.78, opacity: 0.95, heightRatio: 0.46 },
  };
  const droppyImage = new Image();
  let droppyReady = false;
  let droppyAspect = 1;
  let currentPeriod = "weekly";

  droppyImage.onload = () => {
    droppyReady = true;
    droppyAspect = droppyImage.naturalWidth / droppyImage.naturalHeight || 1;
  };
  droppyImage.src = "assets/droppy.PNG";

  Object.keys(forestLayers).forEach((key) => {
    const layer = forestLayers[key];
    layer.img.onload = () => {
      layer.ready = true;
    };
    layer.img.onerror = () => {
      if (layer.src.startsWith("assets/forest/")) return;
      layer.src = layer.src.replace("assets/", "assets/forest/");
      layer.img.src = layer.src;
    };
    layer.img.src = layer.src;
  });

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
    world.groundY = rect.height * 0.88;

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
    skyGradient.addColorStop(0, "#7ecbff");
    skyGradient.addColorStop(0.5, "#dff4ff");
    skyGradient.addColorStop(1, "#fff1c6");

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
    particles = [];
    wasOnGround = true;
    buildClouds();

    world.runner.y = world.groundY - world.runner.height;
    world.runner.velY = 0;
    world.runner.jumpCount = 0;

    lastScoreRendered = -1;
    lastComboRendered = -1;
    updateHud();
  }

  function setFullscreenMode(enabled) {
    root.classList.toggle("droppy--fullscreen", enabled);
    document.body.classList.toggle("droppy-lock", enabled);
    if (enabled && canvasFrame) {
      canvasFrame.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setOverlay(stateName) {
    const showStart = stateName === "start";
    const showGameover = stateName === "gameover";
    const showPause = stateName === "pause";
    if (overlayStart) overlayStart.hidden = !showStart;
    if (overlayGameover) overlayGameover.hidden = !showGameover;
    if (overlayPause) overlayPause.hidden = !showPause;
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
    if (pauseBtn) pauseBtn.disabled = true;
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
      if (overlayPause) overlayPause.hidden = true;
      if (pauseBtn) pauseBtn.textContent = "II";
      if (pauseBtn) pauseBtn.disabled = false;
      if (form) form.hidden = true;
      entryId = null;
      if (window.matchMedia("(max-width: 900px)").matches) {
        setFullscreenMode(true);
      }
      requestAnimationFrame(loop);
    });
  }

  function endGame() {
    state = "gameover";
    running = false;
    setOverlay("gameover");
    if (finalScoreEl) finalScoreEl.textContent = String(score);
    if (pauseBtn) pauseBtn.disabled = true;
    setFullscreenMode(false);
    showForm("Nombre + Instagram o teléfono.");
  }

  function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    running = false;
    setOverlay("pause");
    if (pauseBtn) pauseBtn.textContent = "▶";
  }

  function resumeGame() {
    if (state !== "paused") return;
    state = "playing";
    setOverlay(null);
    running = true;
    lastTime = performance.now();
    if (pauseBtn) pauseBtn.textContent = "II";
    requestAnimationFrame(loop);
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
      if (score > lastScoreRendered) {
        pulseElement(scoreEl);
      }
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

  function spawnSparkles(x, y, count = 8) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(40, 120);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.7,
        size: rand(1.5, 3.2),
        life: rand(0.35, 0.6),
        age: 0,
        type: "sparkle",
        layer: "front",
      });
    }
    particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: rand(8, 12),
      life: 0.4,
      age: 0,
      type: "ring",
      layer: "front",
    });
  }

  function spawnDust(x, y) {
    const count = 6;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: x + rand(-12, 12),
        y: y + rand(-6, 4),
        vx: rand(-20, 20),
        vy: rand(-20, -5),
        size: rand(6, 12),
        life: rand(0.35, 0.7),
        age: 0,
        type: "dust",
        layer: "back",
      });
    }
  }

  function updateParticles(dt) {
    if (!particles.length) return;
    particles = particles.filter((p) => {
      p.age += dt;
      if (p.age >= p.life) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === "dust") {
        p.vy += 40 * dt;
      }
      return true;
    });
  }

  function drawParticles(layer) {
    if (!particles.length) return;
    ctx.save();
    particles.forEach((p) => {
      if (layer && p.layer !== layer) return;
      const t = 1 - p.age / p.life;
      if (p.type === "sparkle") {
        ctx.strokeStyle = `rgba(255, 246, 210, ${0.85 * t})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - p.size, p.y);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.stroke();
      } else if (p.type === "ring") {
        ctx.strokeStyle = `rgba(255, 230, 160, ${0.7 * t})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - t)), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === "dust") {
        ctx.fillStyle = `rgba(90, 60, 30, ${0.25 * t})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  function updateGame(dt, now) {
    if (state !== "playing") return;
    gameTime += dt;
    speed = Math.min(BASE_SPEED + gameTime * SPEED_RAMP, MAX_SPEED);
    distance += (speed * dt) / DISTANCE_SCALE;

    const runner = world.runner;
    const wasOnGroundPrev = wasOnGround;
    runner.velY += runner.gravity * dt;
    runner.y += runner.velY * dt;
    const onGround = runner.y >= world.groundY - runner.height;
    if (onGround) {
      if (!wasOnGroundPrev && runner.velY > 120) {
        spawnDust(runner.x + runner.width * 0.5, world.groundY + 2);
      }
      runner.y = world.groundY - runner.height;
      runner.velY = 0;
      runner.jumpCount = 0;
    }
    wasOnGround = onGround;

    bgOffset += speed * dt * 0.07;
    midOffset += speed * dt * 0.16;
    forestOffset += speed * dt * 0.28;
    fieldOffset += speed * dt * 0.42;
    groundOffset += speed * dt * 0.52;

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
        spawnSparkles(bean.x, bean.y);
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
    updateParticles(dt);
  }

  function drawBackground() {
    drawSky();
    drawSunRays();
    drawSun();
    drawSkyLights();
    drawClouds();
    drawHaze();
    drawParallaxLayer("bg", bgOffset);
    drawParallaxLayer("mg", midOffset);
    drawCoffeeFields(fieldOffset, world.height * 0.76);
    drawParallaxLayer("fg", forestOffset);
  }

  function drawSky() {
    if (!skyGradient) {
      skyGradient = ctx.createLinearGradient(0, 0, 0, world.height);
      skyGradient.addColorStop(0, "#7ecbff");
      skyGradient.addColorStop(0.5, "#dff4ff");
      skyGradient.addColorStop(1, "#fff1c6");
    }
    ctx.fillStyle = skyGradient;
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

  function drawSunRays() {
    const x = world.width * 0.78;
    const y = world.height * 0.16;
    const rayLength = world.height * 0.45;
    const rayWidth = world.width * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(gameTime * 0.12) * 0.04);
    ctx.fillStyle = "rgba(255, 230, 155, 0.16)";
    for (let i = 0; i < 6; i += 1) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-rayWidth * 0.4, rayLength);
      ctx.lineTo(rayWidth * 0.4, rayLength);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHaze() {
    const top = world.height * 0.48;
    const height = world.height * 0.28;
    const haze = ctx.createLinearGradient(0, top, 0, top + height);
    haze.addColorStop(0, "rgba(255, 255, 255, 0)");
    haze.addColorStop(1, "rgba(255, 255, 255, 0.45)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, top, world.width, height);
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
    const step = size * 0.95;
    const startX = -step * 1.4 + (offset % (step * 1.4));
    ctx.beginPath();
    ctx.moveTo(startX, baseY);
    for (let x = startX, index = 0; x <= world.width + step; x += step, index += 1) {
      const peak = size * (0.52 + 0.3 * Math.sin(index * 0.9));
      const ridgeX = x + step * 0.5;
      const ridgeY = baseY - peak;
      ctx.quadraticCurveTo(ridgeX, ridgeY, x + step, baseY);
    }
    ctx.lineTo(world.width + step, world.height);
    ctx.lineTo(startX, world.height);
    ctx.closePath();
    ctx.fill();

    if (blur < 2) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, baseY);
      for (let x = startX, index = 0; x <= world.width + step; x += step, index += 1) {
        const peak = size * (0.42 + 0.24 * Math.sin(index * 0.9));
        const ridgeX = x + step * 0.5;
        const ridgeY = baseY - peak;
        ctx.quadraticCurveTo(ridgeX, ridgeY, x + step, baseY);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawForest(offset, baseY, depth = 1) {
    const spacing = Math.max(26, 48 - depth * 16);
    const startX = -spacing + (offset % spacing);
    const trunkColor = depth < 0.9 ? "#27412b" : "#2f4a31";
    const leafDark = depth < 0.9 ? "#2e5b36" : "#2f6b3a";
    const leafLight = depth < 0.9 ? "#3a7a46" : "#4b8a53";

    for (let x = startX, index = 0; x < world.width + spacing; x += spacing, index += 1) {
      const sway = Math.sin(index * 0.7 + depth * 2.1);
      const treeH = world.height * (0.1 + 0.07 * depth) * (0.85 + 0.2 * sway);
      const trunkH = treeH * 0.22;
      const trunkW = Math.max(2, treeH * 0.08);
      const cx = x + spacing * 0.5;
      const canopyW = treeH * (0.6 + 0.08 * Math.sin(index * 0.9));
      const canopyH = treeH * (0.5 + 0.08 * Math.cos(index * 0.8));
      const canopyY = baseY - treeH + treeH * 0.2;
      const isPine = (index + Math.round(depth * 3)) % 3 === 0;

      const trunkX = cx - trunkW / 2;
      const trunkY = baseY - trunkH + 2;
      const trunkGrad = ctx.createLinearGradient(trunkX, trunkY, trunkX + trunkW, trunkY);
      trunkGrad.addColorStop(0, "#3a2416");
      trunkGrad.addColorStop(0.5, "#6b4a2b");
      trunkGrad.addColorStop(1, "#2a1b11");
      ctx.fillStyle = trunkGrad;
      ctx.beginPath();
      ctx.moveTo(trunkX, trunkY);
      ctx.lineTo(trunkX + trunkW, trunkY);
      ctx.lineTo(trunkX + trunkW * 0.9, baseY);
      ctx.lineTo(trunkX + trunkW * 0.1, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = Math.max(1, trunkW * 0.1);
      ctx.beginPath();
      ctx.moveTo(trunkX + trunkW * 0.25, trunkY + trunkH * 0.2);
      ctx.lineTo(trunkX + trunkW * 0.18, baseY - trunkH * 0.15);
      ctx.stroke();

      ctx.strokeStyle = "rgba(20, 12, 8, 0.35)";
      ctx.lineWidth = Math.max(1, trunkW * 0.18);
      ctx.beginPath();
      ctx.moveTo(cx, trunkY + trunkH * 0.15);
      ctx.lineTo(cx, baseY);
      ctx.stroke();

      ctx.strokeStyle = "rgba(35, 20, 12, 0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i += 1) {
        const lineX = trunkX + trunkW * (0.2 + i * 0.3);
        ctx.beginPath();
        ctx.moveTo(lineX, trunkY + trunkH * 0.15);
        ctx.lineTo(lineX - trunkW * 0.05, baseY - trunkH * (0.05 + i * 0.05));
        ctx.stroke();
      }

      const knotY = trunkY + trunkH * (0.45 + 0.08 * Math.sin(index));
      ctx.fillStyle = "rgba(30, 18, 12, 0.35)";
      ctx.beginPath();
      ctx.ellipse(cx + trunkW * 0.15, knotY, trunkW * 0.16, trunkW * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx + trunkW * 0.15, knotY, trunkW * 0.16, 0.3, Math.PI * 1.6);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 2, trunkW * 0.45, trunkW * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isPine) {
        ctx.fillStyle = leafDark;
        const tierH = canopyH * 0.36;
        for (let tier = 0; tier < 3; tier += 1) {
          const tierW = canopyW * (0.9 - tier * 0.18);
          const tierY = canopyY + tier * (tierH * 0.55);
          ctx.beginPath();
          ctx.moveTo(cx, tierY);
          ctx.lineTo(cx - tierW * 0.5, tierY + tierH);
          ctx.lineTo(cx + tierW * 0.5, tierY + tierH);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.ellipse(cx - canopyW * 0.15, canopyY + canopyH * 0.3, canopyW * 0.2, canopyH * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      const canopyGrad = ctx.createRadialGradient(
        cx - canopyW * 0.2,
        canopyY + canopyH * 0.3,
        canopyW * 0.1,
        cx,
        canopyY + canopyH * 0.55,
        canopyW * 0.8
      );
      canopyGrad.addColorStop(0, leafLight);
      canopyGrad.addColorStop(1, leafDark);
      ctx.fillStyle = canopyGrad;
      ctx.beginPath();
      ctx.ellipse(cx, canopyY + canopyH * 0.6, canopyW * 0.55, canopyH * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - canopyW * 0.35, canopyY + canopyH * 0.58, canopyW * 0.42, canopyH * 0.35, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + canopyW * 0.35, canopyY + canopyH * 0.58, canopyW * 0.42, canopyH * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.ellipse(cx - canopyW * 0.18, canopyY + canopyH * 0.4, canopyW * 0.2, canopyH * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCoffeeFields(offset, baseY) {
    const fieldHeight = world.groundY - baseY + world.height * 0.06;
    const rowCount = 5;
    const fieldColors = ["#6fc66a", "#5ab85b", "#4fae52", "#449d49", "#3f8d42"];

    const drawCoffeeBush = (x, y, size, tint) => {
      const grad = ctx.createRadialGradient(x - size * 0.4, y - size * 0.4, 1, x, y, size);
      grad.addColorStop(0, tint === "light" ? "#6edc6f" : "#3f8d42");
      grad.addColorStop(1, "#2f6b3a");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(x - size * 0.6, y + size * 0.1, size * 0.6, size * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(x + size * 0.6, y + size * 0.15, size * 0.6, size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.ellipse(x - size * 0.2, y - size * 0.25, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#b3372e";
      ctx.beginPath();
      ctx.arc(x + size * 0.25, y - size * 0.05, size * 0.18, 0, Math.PI * 2);
      ctx.arc(x - size * 0.2, y + size * 0.08, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
    };

    for (let row = 0; row < rowCount; row += 1) {
      const t = row / (rowCount - 1);
      const y = baseY + t * fieldHeight;
      const bandH = fieldHeight / rowCount + 10;
      const waveAmp = lerp(10, 3, t);
      const waveFreq = lerp(0.012, 0.03, t);
      const phase = row * 60;

      ctx.fillStyle = fieldColors[row % fieldColors.length];
      ctx.beginPath();
      ctx.moveTo(-40, y);
      for (let x = -40; x <= world.width + 40; x += 40) {
        const wave = Math.sin((x + offset * 0.35 + phase) * waveFreq) * waveAmp;
        ctx.quadraticCurveTo(x + 20, y + wave + waveAmp * 0.45, x + 40, y + wave);
      }
      ctx.lineTo(world.width + 60, y + bandH);
      ctx.lineTo(-60, y + bandH);
      ctx.closePath();
      ctx.fill();

      const spacing = lerp(68, 32, t);
      const shift = (offset * (0.6 + t * 0.7)) % spacing;
      for (let x = -shift; x < world.width + spacing; x += spacing) {
        const wave = Math.sin((x + offset * 0.35 + phase) * waveFreq) * waveAmp;
        const bushY = y + bandH * 0.3 + wave;
        const bushSize = lerp(10, 4, t);
        drawCoffeeBush(x, bushY, bushSize, row % 2 === 0 ? "light" : "dark");
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

  function drawParallaxLayer(key, offset) {
    const layer = forestLayers[key];
    if (!layer || !layer.ready) return;
    const cfg = forestConfig[key];
    const img = layer.img;
    const targetH = world.height * (cfg.heightRatio || 0.4);
    const scale = Math.max(world.width / img.width, targetH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const baseY = world.height * cfg.y;
    const y = baseY - drawH;
    const shift = (offset * cfg.scroll) % drawW;

    ctx.save();
    ctx.globalAlpha = cfg.opacity ?? 1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (let x = -shift - drawW; x < world.width + drawW; x += drawW) {
      ctx.drawImage(img, x, y, drawW, drawH);
    }
    ctx.restore();
  }

  function drawGround() {
    ctx.fillStyle = "#5fb96a";
    ctx.fillRect(0, world.groundY - 12, world.width, 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    for (let x = -groundOffset % 40; x < world.width + 40; x += 40) {
      ctx.fillRect(x, world.groundY - 8, 16, 4);
    }

    const soilBottom = world.height;
    const soil = ctx.createLinearGradient(0, world.groundY, 0, soilBottom);
    soil.addColorStop(0, "#b6834b");
    soil.addColorStop(0.35, "#8a5a2f");
    soil.addColorStop(1, "#4f2f17");
    ctx.fillStyle = soil;
    ctx.fillRect(0, world.groundY, world.width, soilBottom - world.groundY);

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    for (let x = -groundOffset % 46; x < world.width + 46; x += 46) {
      ctx.beginPath();
      ctx.ellipse(x + 12, world.groundY + 5, 18, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(72, 42, 18, 0.35)";
    for (let x = -groundOffset % 72; x < world.width + 72; x += 72) {
      const puffX = x + 30;
      const puffY = world.groundY + 14;
      ctx.beginPath();
      ctx.ellipse(puffX, puffY, 20, 6.5, 0, 0, Math.PI * 2);
      ctx.ellipse(puffX - 18, puffY + 2, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(puffX + 18, puffY + 1, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(50, 30, 16, 0.2)";
    ctx.lineWidth = 2;
    for (let x = -groundOffset % 52; x < world.width + 52; x += 52) {
      ctx.beginPath();
      ctx.moveTo(x, world.groundY + 6);
      ctx.lineTo(x + 14, world.groundY + 13);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(60, 35, 16, 0.15)";
    for (let x = -groundOffset % 64; x < world.width + 64; x += 64) {
      ctx.beginPath();
      ctx.ellipse(x + 22, world.groundY + 24, 8, 3.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
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
    const shadowX = x + w * 0.5;
    const shadowY = world.groundY + 6;
    const shadowW = w * 0.45;
    const shadowH = w * 0.14;
    const shadowGrad = ctx.createRadialGradient(shadowX, shadowY, 2, shadowX, shadowY, shadowW);
    shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0.28)");
    shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
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

    const obsShadowX = obs.x + obs.w * 0.5;
    const obsShadowY = world.groundY + 4;
    const obsShadowW = obs.w * 0.4;
    const obsShadowH = obs.w * 0.14;
    const obsShadow = ctx.createRadialGradient(obsShadowX, obsShadowY, 2, obsShadowX, obsShadowY, obsShadowW);
    obsShadow.addColorStop(0, "rgba(0, 0, 0, 0.26)");
    obsShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = obsShadow;
    ctx.beginPath();
    ctx.ellipse(obsShadowX, obsShadowY, obsShadowW, obsShadowH, 0, 0, Math.PI * 2);
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

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    ctx.ellipse(
      obs.x + obs.w * 0.6,
      obs.y + obs.h * 0.28,
      obs.w * 0.22,
      obs.h * 0.14,
      obs.tilt || 0,
      0,
      Math.PI * 2
    );
    ctx.fill();

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
    ctx.save();
    ctx.translate(bean.x, bean.y);
    ctx.rotate(tilt);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(0, bean.r * 0.85, bean.r * 0.8, bean.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(-bean.r, -bean.r, bean.r, bean.r);
    grad.addColorStop(0, "#ffe6ad");
    grad.addColorStop(0.5, "#e19a2b");
    grad.addColorStop(1, "#8b4a14");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bean.r, bean.r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.ellipse(-bean.r * 0.35, -bean.r * 0.18, bean.r * 0.35, bean.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = Math.max(1.6, bean.r * 0.12);
    ctx.beginPath();
    ctx.moveTo(-bean.r * 0.2, -bean.r * 0.55);
    ctx.quadraticCurveTo(0, 0, bean.r * 0.2, bean.r * 0.55);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 223, 160, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bean.r * 0.3, -bean.r * 0.2);
    ctx.lineTo(bean.r * 0.55, -bean.r * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, world.width, world.height);
    drawBackground();
    drawGround();
    drawParticles("back");

    collectibles.forEach((bean) => drawCollectible(bean));
    obstacles.forEach((obs) => drawObstacle(obs));
    drawRunner();
    drawParticles("front");
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

  async function buildShareImage() {
    const shareCanvas = document.createElement("canvas");
    shareCanvas.width = 1080;
    shareCanvas.height = 1920;
    const sctx = shareCanvas.getContext("2d");
    if (!sctx) return null;

    const grad = sctx.createLinearGradient(0, 0, 0, shareCanvas.height);
    grad.addColorStop(0, "#86d0ff");
    grad.addColorStop(0.6, "#dff5ff");
    grad.addColorStop(1, "#fff2c4");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, shareCanvas.width, shareCanvas.height);

    sctx.fillStyle = "rgba(255, 236, 167, 0.9)";
    sctx.beginPath();
    sctx.arc(860, 240, 130, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = "rgba(255,255,255,0.9)";
    sctx.beginPath();
    sctx.arc(220, 260, 90, 0, Math.PI * 2);
    sctx.arc(310, 260, 80, 0, Math.PI * 2);
    sctx.arc(390, 250, 70, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = "#2f6b3a";
    sctx.fillRect(0, 1300, shareCanvas.width, 220);
    sctx.fillStyle = "#6bb45f";
    sctx.fillRect(0, 1450, shareCanvas.width, 470);

    sctx.fillStyle = "#231f20";
    sctx.font = "700 72px 'Montserrat', system-ui, sans-serif";
    sctx.fillText("Droppy Dash", 120, 220);

    sctx.fillStyle = "#231f20";
    sctx.font = "800 160px 'Montserrat', system-ui, sans-serif";
    sctx.fillText(String(score), 120, 430);
    sctx.font = "600 56px 'Montserrat', system-ui, sans-serif";
    sctx.fillText("Mi score", 120, 500);

    if (droppyReady) {
      const targetW = 520;
      const targetH = targetW / droppyAspect;
      sctx.drawImage(droppyImage, 520, 620, targetW, targetH);
    } else {
      sctx.fillStyle = "#ffd54d";
      sctx.beginPath();
      sctx.arc(770, 820, 140, 0, Math.PI * 2);
      sctx.fill();
    }

    return new Promise((resolve) => {
      shareCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function shareScoreImage() {
    const blob = await buildShareImage();
    if (!blob) return;
    const file = new File([blob], "droppy-score.png", { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Droppy Dash",
          text: `Mi score: ${score}`,
        });
        return;
      } catch (err) {
        // fall back to download
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "droppy-score.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
    const contact = String(formData.get("contact") || "").trim();

    if (!name) {
      showForm("Ingresa tu nombre.", "error");
      return;
    }
    if (!contact) {
      showForm("Ingresa tu Instagram o teléfono.", "error");
      return;
    }

    const durationMs = Math.max(1, Math.round(performance.now() - gameStart));
    const payload = {
      token: sessionToken,
      name,
      contact,
      score,
      distance: Math.round(distance),
      collectibles: collected,
      maxCombo,
      durationMs,
    };

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
      .finally(() => {});
  }

  function initEvents() {
    playBtn?.addEventListener("click", startGame);
    retryBtn?.addEventListener("click", startGame);
    form?.addEventListener("submit", onFormSubmit);
    shareBtn?.addEventListener("click", shareScoreImage);
    jumpBtn?.addEventListener("click", jump);
    pauseBtn?.addEventListener("click", () => {
      if (state === "playing") pauseGame();
      else if (state === "paused") resumeGame();
    });
    resumeBtn?.addEventListener("click", resumeGame);
    restartBtn?.addEventListener("click", startGame);
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
      if (event.code === "KeyP" || event.code === "Escape") {
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
  fetchLeaderboard("weekly");
})();
