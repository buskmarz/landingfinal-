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
  const weekEl = root.querySelector("[data-week]");
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
  let bgOffset = 0;
  let midOffset = 0;

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

  function noise(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
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
    const typeRoll = rng();
    let type = "box";
    if (typeRoll > 0.66) type = "cone";
    if (typeRoll > 0.9) type = "bean";

    const baseSize = clamp(world.width * 0.1, 26, 50);
    let width = baseSize;
    let height = baseSize;
    if (type === "cone") {
      width = baseSize * 0.88;
      height = baseSize * 1.05;
    }
    if (type === "bean") {
      width = baseSize * 1.15;
      height = baseSize * 0.85;
    }

    obstacles.push({
      x: world.width + rand(0, world.width * 0.3),
      y: world.groundY - height,
      w: width,
      h: height,
      type,
    });

    const minGap = clamp(1.2 - gameTime * 0.02, 0.7, 1.2);
    const maxGap = clamp(1.9 - gameTime * 0.02, 1.1, 1.9);
    obstacleTimer = rand(minGap, maxGap);
  }

  function spawnCollectible() {
    const size = clamp(world.width * 0.06, 16, 26);
    const lift = rand(90, 180);
    collectibles.push({
      x: world.width + rand(40, world.width * 0.4),
      y: world.groundY - lift,
      r: size * 0.5,
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
      lastComboRendered = combo;
    }
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

    bgOffset += speed * dt * 0.08;
    midOffset += speed * dt * 0.18;

    obstacleTimer -= dt;
    if (obstacleTimer <= 0) spawnObstacle();

    collectibleTimer -= dt;
    if (collectibleTimer <= 0) spawnCollectible();

    obstacles.forEach((obs) => {
      obs.x -= speed * dt;
    });
    collectibles.forEach((bean) => {
      bean.x -= speed * dt;
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
    ctx.fillStyle = skyGradient || "#f7fbff";
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.fillStyle = "rgba(255, 215, 75, 0.9)";
    ctx.beginPath();
    ctx.arc(world.width * 0.8, world.height * 0.15, world.width * 0.08, 0, Math.PI * 2);
    ctx.fill();

    drawMountains(bgOffset * 0.25, world.height * 0.52, world.width * 0.18, "#cdd7e8");
    drawMountains(bgOffset * 0.45, world.height * 0.62, world.width * 0.2, "#b6c6dc");

    drawCity(midOffset * 0.6, world.height * 0.7);

    drawClouds();
  }

  function drawMountains(offset, baseY, size, color) {
    ctx.fillStyle = color;
    const step = size * 1.2;
    const startX = -step + (offset % step);
    for (let x = startX; x < world.width + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + step * 0.5, baseY - size);
      ctx.lineTo(x + step, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCity(offset, baseY) {
    const block = 76;
    const shift = offset % block;
    const startIndex = Math.floor(offset / block);
    const count = Math.ceil(world.width / block) + 3;
    const palette = ["#9cadc3", "#8fa2b8", "#a1b3c8"];

    for (let i = -1; i < count; i += 1) {
      const idx = startIndex + i;
      const width = block * (0.55 + noise(idx * 2.1) * 0.4);
      const height = 32 + noise(idx * 3.4) * 70;
      const x = i * block - shift;
      const y = baseY - height;
      const shade = palette[Math.floor(noise(idx * 1.3) * palette.length)];

      ctx.fillStyle = shade;
      ctx.fillRect(x, y, width, height);

      ctx.fillStyle = "rgba(35, 31, 32, 0.12)";
      ctx.fillRect(x, y, width, 3);

      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.fillRect(x + width * 0.18, y + 10, width * 0.12, height * 0.45);
      ctx.fillRect(x + width * 0.62, y + 14, width * 0.1, height * 0.32);
    }
  }

  function drawClouds() {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
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
    ctx.fillStyle = "#f5efe3";
    ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);
    ctx.fillStyle = "rgba(35, 31, 32, 0.08)";
    for (let x = 0; x < world.width; x += 24) {
      ctx.fillRect(x, world.groundY + 12, 10, 4);
    }
  }

  function drawRunner() {
    const runner = world.runner;
    const x = runner.x;
    const y = runner.y;
    const w = runner.width;
    const h = runner.height;

    if (droppyReady) {
      const scale = 1.22;
      const drawHeight = h * scale;
      const drawWidth = drawHeight * droppyAspect;
      const drawX = x + (w - drawWidth) / 2;
      const drawY = y + h - drawHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(droppyImage, drawX, drawY, drawWidth, drawHeight);
      return;
    }

    ctx.fillStyle = "#ffd74b";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y);
    ctx.quadraticCurveTo(x + w, y + h * 0.45, x + w * 0.6, y + h);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 1.05, x + w * 0.4, y + h);
    ctx.quadraticCurveTo(x, y + h * 0.45, x + w * 0.5, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.68, y + h * 0.32, w * 0.15, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#231f20";
    ctx.beginPath();
    ctx.arc(x + w * 0.45, y + h * 0.5, w * 0.06, 0, Math.PI * 2);
    ctx.arc(x + w * 0.62, y + h * 0.5, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawObstacle(obs) {
    ctx.save();
    if (obs.type === "box") {
      ctx.fillStyle = "#2e2a2d";
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.fillStyle = "#3b3539";
      ctx.fillRect(obs.x + 4, obs.y + 4, obs.w - 8, obs.h * 0.4);
    } else if (obs.type === "cone") {
      ctx.fillStyle = "#f08a5d";
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.h);
      ctx.lineTo(obs.x + obs.w * 0.5, obs.y);
      ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#f4b089";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.w * 0.2, obs.y + obs.h * 0.65);
      ctx.lineTo(obs.x + obs.w * 0.8, obs.y + obs.h * 0.65);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#5c3a2f";
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.w * 0.5, obs.y + obs.h * 0.6, obs.w * 0.5, obs.h * 0.45, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.w * 0.4, obs.y + obs.h * 0.3);
      ctx.lineTo(obs.x + obs.w * 0.6, obs.y + obs.h * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCollectible(bean) {
    ctx.fillStyle = "#f7b500";
    ctx.beginPath();
    ctx.ellipse(bean.x, bean.y, bean.r, bean.r * 0.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bean.x - bean.r * 0.15, bean.y - bean.r * 0.5);
    ctx.lineTo(bean.x + bean.r * 0.2, bean.y + bean.r * 0.5);
    ctx.stroke();
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

  async function fetchLeaderboard(focusId) {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '<li class="droppy__leaderboard-empty">Cargando leaderboard...</li>';

    try {
      const url = new URL(`${API_BASE}/leaderboard`, window.location.origin);
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

    if (!entries.length) {
      leaderboardList.innerHTML = '<li class="droppy__leaderboard-empty">Aún no hay scores esta semana.</li>';
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

    if (weekEl) {
      weekEl.textContent = data.weekStart ? `Semana del ${data.weekStart}` : "Semana en curso";
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
        fetchLeaderboard(entryId);
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
  fetchLeaderboard();
})();
