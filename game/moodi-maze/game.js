(() => {
  "use strict";

  const canvas = document.querySelector("#moodi-game");
  const ctx = canvas?.getContext("2d", { alpha: false, willReadFrequently: true });
  const statusNode = document.querySelector("#game-status");
  if (!canvas || !ctx) return;

  const MOODI_SOURCES = {
    wave: "../../assets/moodi-wave.png",
    jump: "../../assets/moodi-jump.png",
    point: "../../assets/moodi-point.png",
    meditate: "../../assets/moodi-meditate.png",
    cup: "../../assets/moodi-cup.png",
  };
  const moodiSprites = {};
  Object.entries(MOODI_SOURCES).forEach(([name, source]) => {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    image.addEventListener("load", () => draw());
    moodiSprites[name] = image;
  });

  const WIDTH = 720;
  const HEIGHT = 860;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TILE = 40;
  const MAZE_X = 60;
  const MAZE_Y = 116;
  const COLORS = {
    yellow: "#ffde00",
    orange: "#ffba00",
    ink: "#231f20",
    cream: "#fff9e8",
    paper: "#fffdf5",
    coffee: "#7a4324",
    coffeeDark: "#3a2016",
    lilac: "#8d78b5",
    sage: "#73a78a",
    coral: "#ed806a",
    fog: "#d9d7d1",
  };

  const MAP = [
    "###############",
    "#.............#",
    "#.###.###.###.#",
    "#.#.........#.#",
    "#.#.##...##.#.#",
    "#...#.....#...#",
    "###.#.###.#.###",
    "#...#.....#...#",
    "#.#.##...##.#.#",
    "#.#.........#.#",
    "#.###.###.###.#",
    "#.............#",
    "###############",
  ];

  const DIRECTIONS = {
    left: { x: -1, y: 0, name: "left" },
    right: { x: 1, y: 0, name: "right" },
    up: { x: 0, y: -1, name: "up" },
    down: { x: 0, y: 1, name: "down" },
    none: { x: 0, y: 0, name: "none" },
  };
  const DIRECTION_LIST = [DIRECTIONS.left, DIRECTIONS.right, DIRECTIONS.up, DIRECTIONS.down];

  const POWER_CELLS = [
    { x: 7, y: 1 },
    { x: 1, y: 7 },
    { x: 13, y: 11 },
  ];
  const PLAYER_SPAWN = { x: 1, y: 1 };
  const CLOUD_CONFIG = [
    { name: "Bruma", kind: "streak", x: 13, y: 1, color: COLORS.lilac, speed: 2.15 },
    { name: "Vaho", kind: "spiral", x: 1, y: 11, color: COLORS.sage, speed: 2.05 },
    { name: "Nimbo", kind: "heavy", x: 7, y: 5, color: COLORS.coral, speed: 1.95 },
  ];

  const state = {
    mode: "menu",
    score: 0,
    best: readBest(),
    lives: 3,
    elapsed: 0,
    power: 0,
    freeze: 0,
    beans: new Map(),
    sparks: new Map(),
    player: createActor(PLAYER_SPAWN.x, PLAYER_SPAWN.y, 4.35),
    clouds: CLOUD_CONFIG.map((item) => ({
      ...createActor(item.x, item.y, item.speed),
      spawnX: item.x,
      spawnY: item.y,
      name: item.name,
      kind: item.kind,
      color: item.color,
    })),
    rng: mulberry32(84622),
    frame: 0,
    message: "",
    messageTime: 0,
  };

  let lastTimestamp = performance.now();
  let externalClock = false;

  function mulberry32(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = Math.imul(value ^ (value >>> 15), value | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function readBest() {
    try {
      return Number.parseInt(localStorage.getItem("betterMoodMoodiBest") || "0", 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest() {
    state.best = Math.max(state.best, state.score);
    try {
      localStorage.setItem("betterMoodMoodiBest", String(state.best));
    } catch {
      // El juego sigue funcionando cuando el almacenamiento está bloqueado.
    }
  }

  function trackEvent(eventName) {
    const host = window.location.hostname.toLowerCase();
    const isPublicHost = host === "bmoodcoffee.com" || host === "www.bmoodcoffee.com" || /\.netlify\.(app|com)$/.test(host);
    if (!isPublicHost) return;
    const payload = JSON.stringify({
      event: eventName,
      cta: "moodi-maze",
      path: window.location.pathname,
      href: window.location.href,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-event", new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch("/api/track-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }

  function createActor(x, y, speed) {
    return {
      cellX: x,
      cellY: y,
      nextX: x,
      nextY: y,
      progress: 0,
      direction: DIRECTIONS.none,
      queued: DIRECTIONS.none,
      speed,
    };
  }

  function keyFor(x, y) {
    return `${x},${y}`;
  }

  function isWalkable(x, y) {
    return Boolean(MAP[y] && MAP[y][x] && MAP[y][x] !== "#");
  }

  function canMove(actor, direction) {
    if (!direction || direction === DIRECTIONS.none) return false;
    return isWalkable(actor.cellX + direction.x, actor.cellY + direction.y);
  }

  function actorPoint(actor) {
    return {
      x: actor.cellX + (actor.nextX - actor.cellX) * actor.progress,
      y: actor.cellY + (actor.nextY - actor.cellY) * actor.progress,
    };
  }

  function resetActor(actor, x, y) {
    actor.cellX = x;
    actor.cellY = y;
    actor.nextX = x;
    actor.nextY = y;
    actor.progress = 0;
    actor.direction = DIRECTIONS.none;
    actor.queued = DIRECTIONS.none;
  }

  function populateCollectibles() {
    state.beans.clear();
    state.sparks.clear();
    const reserved = new Set([
      keyFor(PLAYER_SPAWN.x, PLAYER_SPAWN.y),
      ...CLOUD_CONFIG.map((cloud) => keyFor(cloud.x, cloud.y)),
      ...POWER_CELLS.map((cell) => keyFor(cell.x, cell.y)),
    ]);

    MAP.forEach((row, y) => {
      row.split("").forEach((cell, x) => {
        if (cell !== "." || reserved.has(keyFor(x, y))) return;
        if ((x * 3 + y * 5) % 4 !== 0) state.beans.set(keyFor(x, y), { x, y });
      });
    });
    POWER_CELLS.forEach((cell) => state.sparks.set(keyFor(cell.x, cell.y), { ...cell }));
  }

  function resetPositions() {
    resetActor(state.player, PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    state.clouds.forEach((cloud) => resetActor(cloud, cloud.spawnX, cloud.spawnY));
  }

  function resetGame() {
    state.score = 0;
    state.lives = 3;
    state.elapsed = 0;
    state.power = 0;
    state.freeze = 0;
    state.frame = 0;
    state.message = "";
    state.messageTime = 0;
    state.rng = mulberry32(84622);
    populateCollectibles();
    resetPositions();
  }

  function startGame() {
    resetGame();
    state.mode = "playing";
    announce("Partida iniciada. Reúne todos los granos.");
    trackEvent("moodi_game_start");
    canvas.focus({ preventScroll: true });
    draw();
  }

  function togglePause() {
    if (state.mode === "playing") {
      state.mode = "paused";
      announce("Juego en pausa.");
    } else if (state.mode === "paused") {
      state.mode = "playing";
      announce("Continúa la partida.");
    }
    draw();
  }

  function restartGame() {
    startGame();
    showMessage("NUEVA RUTA", 1.1);
  }

  function announce(message) {
    if (statusNode) statusNode.textContent = message;
  }

  function showMessage(message, duration = 1) {
    state.message = message;
    state.messageTime = duration;
  }

  function choosePlayerDirection(actor) {
    if (canMove(actor, actor.queued)) {
      actor.direction = actor.queued;
      return actor.queued;
    }
    if (canMove(actor, actor.direction)) return actor.direction;
    actor.direction = DIRECTIONS.none;
    return DIRECTIONS.none;
  }

  function chooseCloudDirection(cloud) {
    let candidates = DIRECTION_LIST.filter((direction) => canMove(cloud, direction));
    if (candidates.length > 1) {
      const reverseX = -cloud.direction.x;
      const reverseY = -cloud.direction.y;
      const withoutReverse = candidates.filter(
        (direction) => direction.x !== reverseX || direction.y !== reverseY
      );
      if (withoutReverse.length) candidates = withoutReverse;
    }
    if (!candidates.length) return DIRECTIONS.none;

    const player = actorPoint(state.player);
    const frightened = state.power > 0;
    candidates.sort((a, b) => {
      const distanceA =
        Math.abs(cloud.cellX + a.x - player.x) + Math.abs(cloud.cellY + a.y - player.y);
      const distanceB =
        Math.abs(cloud.cellX + b.x - player.x) + Math.abs(cloud.cellY + b.y - player.y);
      return frightened ? distanceB - distanceA : distanceA - distanceB;
    });

    const exploreChance = frightened ? 0.16 : 0.28;
    if (state.rng() < exploreChance) {
      return candidates[Math.floor(state.rng() * candidates.length)];
    }
    return candidates[0];
  }

  function advanceActor(actor, distance, selectDirection) {
    let remaining = distance;
    let guard = 0;
    while (remaining > 0.0001 && guard < 12) {
      guard += 1;
      const stationary = actor.cellX === actor.nextX && actor.cellY === actor.nextY;
      if (stationary) {
        const direction = selectDirection(actor);
        if (!direction || direction === DIRECTIONS.none || !canMove(actor, direction)) return;
        actor.direction = direction;
        actor.nextX = actor.cellX + direction.x;
        actor.nextY = actor.cellY + direction.y;
        actor.progress = 0;
      }

      const segmentLeft = 1 - actor.progress;
      const step = Math.min(segmentLeft, remaining);
      actor.progress += step;
      remaining -= step;
      if (actor.progress >= 0.999999) {
        actor.cellX = actor.nextX;
        actor.cellY = actor.nextY;
        actor.progress = 0;
      }
    }
  }

  function collectAtPlayer() {
    const player = actorPoint(state.player);
    const x = Math.round(player.x);
    const y = Math.round(player.y);
    if (Math.abs(player.x - x) > 0.34 || Math.abs(player.y - y) > 0.34) return;
    const key = keyFor(x, y);

    if (state.beans.delete(key)) {
      state.score += 10;
      showMessage("+10", 0.35);
    }
    if (state.sparks.delete(key)) {
      state.score += 50;
      state.power = 7;
      showMessage("MODO BRILLO", 1.2);
      announce("Modo brillo activado por siete segundos.");
    }
    if (!state.beans.size && state.mode === "playing") {
      state.score += state.lives * 150 + Math.max(0, Math.round(900 - state.elapsed * 5));
      state.mode = "won";
      saveBest();
      trackEvent("moodi_game_won");
      announce(`Ruta completada con ${state.score} puntos.`);
    }
  }

  function checkCloudCollisions() {
    const player = actorPoint(state.player);
    for (const cloud of state.clouds) {
      const point = actorPoint(cloud);
      const distance = Math.hypot(point.x - player.x, point.y - player.y);
      if (distance >= 0.55) continue;

      if (state.power > 0) {
        state.score += 125;
        resetActor(cloud, cloud.spawnX, cloud.spawnY);
        showMessage("VAPOR FUERA +125", 0.9);
        announce("Moodi disipó un vapor travieso.");
        continue;
      }

      state.lives -= 1;
      if (state.lives <= 0) {
        state.mode = "gameover";
        saveBest();
        trackEvent("moodi_game_over");
        announce(`Fin de la ruta. Puntaje ${state.score}.`);
      } else {
        state.power = 0;
        state.freeze = 0.85;
        resetPositions();
        showMessage("RESPIRA. SIGUE.", 1.2);
        announce(`Te quedan ${state.lives} oportunidades.`);
      }
      return;
    }
  }

  function update(dt) {
    if (state.mode !== "playing") return;
    const safeDt = Math.min(Math.max(dt, 0), 0.05);
    state.frame += 1;
    state.elapsed += safeDt;
    state.power = Math.max(0, state.power - safeDt);
    state.messageTime = Math.max(0, state.messageTime - safeDt);

    if (state.freeze > 0) {
      state.freeze = Math.max(0, state.freeze - safeDt);
      return;
    }

    advanceActor(state.player, state.player.speed * safeDt, choosePlayerDirection);
    state.clouds.forEach((cloud) => {
      const speedFactor = state.power > 0 ? 0.72 : 1;
      advanceActor(cloud, cloud.speed * speedFactor * safeDt, chooseCloudDirection);
    });
    collectAtPlayer();
    checkCloudCollisions();
  }

  function mazeToCanvas(point) {
    return {
      x: MAZE_X + point.x * TILE + TILE / 2,
      y: MAZE_Y + point.y * TILE + TILE / 2,
    };
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = COLORS.yellow;
    ctx.beginPath();
    ctx.arc(42, 34, 88, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.arc(695, 830, 118, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.ink;
    ctx.font = "800 22px Metropolis, Avenir Next, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("LA RUTA DE MOODI", 30, 36);
    ctx.font = "600 12px Metropolis, Avenir Next, sans-serif";
    ctx.fillText("JUEGOS BETTER MOOD", 31, 59);
  }

  function drawHud() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.ink;
    ctx.font = "800 13px Metropolis, Avenir Next, sans-serif";
    ctx.fillText("PUNTOS", 304, 32);
    ctx.fillText("GRANOS", 418, 32);
    ctx.font = "800 22px Metropolis, Avenir Next, sans-serif";
    ctx.fillText(String(state.score).padStart(4, "0"), 304, 56);
    ctx.fillText(String(state.beans.size).padStart(2, "0"), 418, 56);

    ctx.fillStyle = COLORS.paper;
    roundedRect(528, 20, 72, 52, 18);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.font = "800 22px Metropolis, Avenir Next, sans-serif";
    ctx.fillText(state.mode === "paused" ? "▶" : "Ⅱ", 564, 47);

    ctx.fillStyle = COLORS.paper;
    roundedRect(610, 20, 72, 52, 18);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.font = "800 24px Metropolis, Avenir Next, sans-serif";
    ctx.fillText("↻", 646, 47);

    drawMiniMoodi(478, 48, 0.68);
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "left";
    ctx.font = "800 15px Metropolis, Avenir Next, sans-serif";
    ctx.fillText(`×${state.lives}`, 493, 49);
  }

  function drawMaze() {
    ctx.fillStyle = "#f1e8d3";
    roundedRect(MAZE_X - 8, MAZE_Y - 8, MAP[0].length * TILE + 16, MAP.length * TILE + 16, 26);
    ctx.fill();
    ctx.strokeStyle = "rgba(122, 67, 36, 0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    MAP.forEach((row, y) => {
      row.split("").forEach((cell, x) => {
        const px = MAZE_X + x * TILE;
        const py = MAZE_Y + y * TILE;
        if (cell === "#") {
          ctx.fillStyle = COLORS.ink;
          roundedRect(px + 2, py + 2, TILE - 4, TILE - 4, 9);
          ctx.fill();
          if ((x + y) % 4 === 0) {
            ctx.strokeStyle = "rgba(255, 222, 0, 0.28)";
            ctx.lineWidth = 2;
            roundedRect(px + 8, py + 8, TILE - 16, TILE - 16, 6);
            ctx.stroke();
          }
        }
      });
    });

    state.beans.forEach((bean) => {
      const point = mazeToCanvas(bean);
      drawBean(point.x, point.y, 6.5);
    });
    state.sparks.forEach((spark) => {
      const point = mazeToCanvas(spark);
      drawSpark(point.x, point.y, 10 + Math.sin(state.frame * 0.08) * 1.5);
    });

    state.clouds.forEach((cloud, index) => {
      const point = mazeToCanvas(actorPoint(cloud));
      drawVapor(point.x, point.y, cloud, index);
    });

    if (state.freeze > 0) {
      ctx.fillStyle = `rgba(255, 222, 0, ${Math.min(0.5, state.freeze * 0.45)})`;
      roundedRect(MAZE_X - 8, MAZE_Y - 8, MAP[0].length * TILE + 16, MAP.length * TILE + 16, 26);
      ctx.fill();
    }

    const player = mazeToCanvas(actorPoint(state.player));
    drawMoodi(player.x, player.y, state.player.direction, state.power > 0);
  }

  function drawBean(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.55);
    ctx.fillStyle = COLORS.coffee;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.72, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d89c63";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1, -size * 0.7);
    ctx.bezierCurveTo(3, -2, -3, 2, 1, size * 0.7);
    ctx.stroke();
    ctx.restore();
  }

  function drawSpark(x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.frame * 0.025);
    ctx.fillStyle = COLORS.yellow;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 16; i += 1) {
      const angle = (Math.PI * i) / 8;
      const currentRadius = i % 2 === 0 ? radius : radius * 0.45;
      const px = Math.cos(angle) * currentRadius;
      const py = Math.sin(angle) * currentRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function spriteIsReady(sprite) {
    return Boolean(sprite?.complete && sprite.naturalWidth > 0);
  }

  function drawMoodiPose(name, x, y, width, options = {}) {
    const { mirror = false, powered = false, lean = 0, bob = 0 } = options;
    const sprite = moodiSprites[name];
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(lean);

    if (powered) {
      const pulse = width * 0.62 + Math.sin(state.frame * 0.18) * 3;
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (spriteIsReady(sprite)) {
      const height = width * (sprite.naturalHeight / sprite.naturalWidth);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.scale(mirror ? -1 : 1, 1);
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
      ctx.restore();
    } else {
      ctx.fillStyle = COLORS.yellow;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, width * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 ${Math.round(width * 0.34)}px Metropolis, Avenir Next, sans-serif`;
      ctx.fillText("M", 0, 1);
    }
    ctx.restore();
  }

  function drawMiniMoodiVector(x, y, direction = DIRECTIONS.none, powered = false, scale = 1) {
    const facing = direction?.x < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * scale, scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (powered) {
      ctx.strokeStyle = COLORS.orange;
      ctx.globalAlpha = 0.52;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 31 + Math.sin(state.frame * 0.16) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 3.2;
    ctx.fillStyle = "#fff8e5";

    ctx.beginPath();
    ctx.ellipse(0, 8, 17, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, 25);
    ctx.quadraticCurveTo(-17, 29, -20, 25);
    ctx.moveTo(10, 25);
    ctx.quadraticCurveTo(17, 29, 20, 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-14, 6);
    ctx.quadraticCurveTo(-24, 10, -26, 3);
    ctx.moveTo(14, 4);
    if (direction?.x) {
      ctx.quadraticCurveTo(22, 1, 28, -4);
      ctx.moveTo(27, -4);
      ctx.lineTo(23, -5);
      ctx.moveTo(27, -4);
      ctx.lineTo(25, 0);
    } else {
      ctx.quadraticCurveTo(23, 8, 24, 1);
    }
    ctx.stroke();

    ctx.fillStyle = "#fff7dc";
    ctx.beginPath();
    ctx.moveTo(-27, -7);
    ctx.quadraticCurveTo(-22, -29, 0, -32);
    ctx.quadraticCurveTo(22, -29, 27, -7);
    ctx.quadraticCurveTo(19, -2, 12, -4);
    ctx.lineTo(-12, -4);
    ctx.quadraticCurveTo(-19, -2, -27, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 222, 0, 0.14)";
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 2.1;
    [[-12, -17, 5, 4], [2, -23, 6, 4.5], [15, -14, 4, 5]].forEach((spot) => {
      ctx.beginPath();
      ctx.ellipse(spot[0], spot[1], spot[2], spot[3], -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.fillStyle = COLORS.ink;
    ctx.strokeStyle = COLORS.ink;
    ctx.beginPath();
    ctx.ellipse(-6, 3, 2.7, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, 3, 2.7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.paper;
    ctx.beginPath();
    ctx.arc(-5.4, 1.6, 0.9, 0, Math.PI * 2);
    ctx.arc(6.6, 1.6, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f2a982";
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.ellipse(-11, 10, 3.1, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(11, 10, 3.1, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 8, 5.6, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawMoodi(x, y, direction, powered) {
    const lean = direction?.x ? direction.x * 0.075 : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = "rgba(35, 31, 32, 0.3)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.arc(0, 1, powered ? 25 : 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = powered ? COLORS.orange : COLORS.yellow;
    ctx.lineWidth = powered ? 5 : 4;
    ctx.stroke();

    if (powered) {
      const orbit = REDUCED_MOTION ? 0 : state.frame * 0.08;
      for (let i = 0; i < 2; i += 1) {
        const angle = orbit + Math.PI * i;
        drawSpark(Math.cos(angle) * 30, Math.sin(angle) * 30, 4.6);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(0, REDUCED_MOTION ? 0 : Math.sin(state.frame * 0.12) * 1.15);
    ctx.translate(x, y - 2);
    ctx.rotate(lean);
    drawMiniMoodiVector(0, 0, direction, powered, powered ? 1.06 : 1);
    ctx.restore();
  }

  function drawMiniMoodi(x, y, scale) {
    drawMiniMoodiVector(x, y, DIRECTIONS.none, false, scale);
  }

  function drawVapor(x, y, cloud, index, bright = state.power > 0) {
    ctx.save();
    ctx.translate(x, y);
    const wobble = REDUCED_MOTION ? 0 : Math.sin(state.frame * 0.1 + index * 1.8) * 1.6;
    const lift = REDUCED_MOTION ? 0 : Math.cos(state.frame * 0.08 + index) * 1.2;
    ctx.translate(wobble, lift);
    ctx.scale(cloud.direction?.x < 0 ? -1 : 1, 1);
    ctx.shadowColor = "rgba(35, 31, 32, 0.22)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = bright ? COLORS.ink : cloud.color;
    ctx.strokeStyle = bright ? COLORS.yellow : COLORS.ink;
    ctx.lineWidth = bright ? 3.6 : 2.8;
    ctx.lineJoin = "round";

    if (bright) {
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = COLORS.yellow;
      ctx.beginPath();
      ctx.arc(0, 0, 20.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    if (cloud.kind === "streak") {
      ctx.moveTo(-20, 7);
      ctx.bezierCurveTo(-24, 1, -19, -10, -9, -11);
      ctx.bezierCurveTo(-4, -18, 8, -15, 12, -7);
      ctx.bezierCurveTo(22, -6, 23, 5, 16, 9);
      ctx.bezierCurveTo(10, 15, 0, 15, -5, 12);
      ctx.lineTo(-16, 16);
      ctx.lineTo(-12, 9);
      ctx.closePath();
    } else if (cloud.kind === "spiral") {
      ctx.moveTo(-13, 9);
      ctx.bezierCurveTo(-19, 1, -14, -9, -6, -11);
      ctx.bezierCurveTo(-11, -18, -2, -22, 5, -16);
      ctx.bezierCurveTo(13, -16, 18, -6, 14, 1);
      ctx.bezierCurveTo(21, 8, 14, 17, 5, 15);
      ctx.bezierCurveTo(-2, 18, -6, 14, -8, 19);
      ctx.bezierCurveTo(-11, 14, -9, 10, -13, 9);
      ctx.closePath();
    } else {
      ctx.moveTo(-20, 8);
      ctx.bezierCurveTo(-23, 0, -16, -9, -9, -8);
      ctx.bezierCurveTo(-8, -17, 4, -19, 10, -12);
      ctx.bezierCurveTo(18, -12, 23, -4, 19, 4);
      ctx.bezierCurveTo(25, 9, 18, 16, 10, 14);
      ctx.lineTo(6, 18);
      ctx.lineTo(1, 14);
      ctx.lineTo(-5, 18);
      ctx.lineTo(-9, 13);
      ctx.bezierCurveTo(-15, 15, -20, 12, -20, 8);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";

    if (bright) {
      ctx.strokeStyle = COLORS.cream;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-9, -2);
      ctx.quadraticCurveTo(-5, 2, -1, -2);
      ctx.moveTo(3, -2);
      ctx.quadraticCurveTo(7, 2, 11, -2);
      ctx.stroke();
      ctx.strokeStyle = cloud.color;
      ctx.fillStyle = cloud.color;
      ctx.lineWidth = 2.2;
      if (cloud.kind === "streak") {
        ctx.beginPath();
        ctx.moveTo(-8, 8);
        ctx.lineTo(-2, 8);
        ctx.moveTo(3, 8);
        ctx.lineTo(9, 8);
        ctx.stroke();
      } else if (cloud.kind === "spiral") {
        ctx.beginPath();
        ctx.arc(1, 8, 5, 0.2, Math.PI * 2.1);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(-6, 8, 1.5, 0, Math.PI * 2);
        ctx.arc(0, 9, 1.5, 0, Math.PI * 2);
        ctx.arc(6, 8, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = COLORS.paper;
      ctx.beginPath();
      ctx.ellipse(-6, -3, 3.5, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(6, -3, 3.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(-5, -2, 1.5, 0, Math.PI * 2);
      ctx.arc(7, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = COLORS.cream;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      if (cloud.kind === "streak") {
        ctx.beginPath();
        ctx.moveTo(-27, -5);
        ctx.lineTo(-22, -5);
        ctx.moveTo(-29, 2);
        ctx.lineTo(-22, 2);
        ctx.stroke();
      } else if (cloud.kind === "spiral") {
        ctx.beginPath();
        ctx.arc(1, 8, 5.5, 0.2, Math.PI * 2.1);
        ctx.stroke();
      } else {
        ctx.fillStyle = COLORS.cream;
        ctx.beginPath();
        ctx.arc(-6, 8, 1.4, 0, Math.PI * 2);
        ctx.arc(0, 9, 1.4, 0, Math.PI * 2);
        ctx.arc(6, 8, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawControls() {
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "left";
    ctx.font = "700 12px Metropolis, Avenir Next, sans-serif";
    ctx.fillText("MOVER", 68, 701);
    ctx.font = "500 11px Metropolis, Avenir Next, sans-serif";
    ctx.fillText("Flechas · WASD", 68, 720);
    ctx.fillText("P pausa · R reinicia · F pantalla", 68, 740);

    const controls = [
      { direction: DIRECTIONS.up, x: 540, y: 692, label: "↑" },
      { direction: DIRECTIONS.left, x: 492, y: 744, label: "←" },
      { direction: DIRECTIONS.right, x: 588, y: 744, label: "→" },
      { direction: DIRECTIONS.down, x: 540, y: 796, label: "↓" },
    ];
    controls.forEach((control) => {
      const active = state.player.queued === control.direction || state.player.direction === control.direction;
      ctx.fillStyle = active ? COLORS.yellow : COLORS.paper;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(control.x, control.y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 25px Metropolis, Avenir Next, sans-serif";
      ctx.fillText(control.label, control.x, control.y + 1);
    });

    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "left";
    ctx.font = "800 18px Metropolis, Avenir Next, sans-serif";
    ctx.fillText(state.power > 0 ? `BRILLO ${state.power.toFixed(1)}s` : `MEJOR ${state.best}`, 68, 792);
    ctx.font = "500 11px Metropolis, Avenir Next, sans-serif";
    ctx.fillText("Reúne café. Esquiva los vapores.", 68, 816);
  }

  function drawMessage() {
    if (!state.message || state.messageTime <= 0 || state.mode !== "playing") return;
    ctx.save();
    ctx.fillStyle = COLORS.yellow;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2.5;
    roundedRect(220, 91, 280, 48, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 15px Metropolis, Avenir Next, sans-serif";
    ctx.fillText(state.message, 360, 116);
    ctx.restore();
  }

  function drawOverlay() {
    if (state.mode === "playing") return;
    ctx.save();
    ctx.fillStyle = "rgba(35, 31, 32, 0.9)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const isMenu = state.mode === "menu";
    const isPaused = state.mode === "paused";
    const isWon = state.mode === "won";
    ctx.fillStyle = COLORS.cream;
    roundedRect(80, 160, 560, 535, 40);
    ctx.fill();

    ctx.fillStyle = COLORS.ink;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(360, 245, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    drawMoodiPose(
      isMenu ? "wave" : isPaused ? "meditate" : isWon ? "jump" : "cup",
      360,
      245,
      isPaused ? 126 : 142,
      { powered: isWon, bob: REDUCED_MOTION ? 0 : Math.sin(state.frame * 0.045) * 2 }
    );
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 15px Metropolis, Avenir Next, sans-serif";
    ctx.fillText("JUEGOS BETTER MOOD", 360, 329);
    ctx.font = "900 42px Metropolis, Avenir Next, sans-serif";
    ctx.fillText(
      isMenu ? "LA RUTA DE MOODI" : isPaused ? "PAUSA" : isWon ? "RUTA COMPLETA" : "LOS VAPORES GANAN",
      360,
      374
    );
    ctx.font = "600 17px Metropolis, Avenir Next, sans-serif";
    ctx.fillText(
      isMenu
        ? "Recolecta café. Esquiva los vapores traviesos."
        : isPaused
          ? "Tu café te espera."
          : `${state.score} puntos · Mejor ${state.best}`,
      360,
      416
    );

    if (isMenu) {
      ctx.font = "800 12px Metropolis, Avenir Next, sans-serif";
      ctx.fillText("LOS VAPORES", 360, 449);
      CLOUD_CONFIG.forEach((cloud, index) => {
        const x = 280 + index * 80;
        drawVapor(x, 479, { ...cloud, direction: DIRECTIONS.right }, index, false);
        ctx.fillStyle = COLORS.ink;
        ctx.textAlign = "center";
        ctx.font = "700 10px Metropolis, Avenir Next, sans-serif";
        ctx.fillText(cloud.name.toUpperCase(), x, 510);
      });
      ctx.fillStyle = COLORS.ink;
      ctx.font = "500 12px Metropolis, Avenir Next, sans-serif";
      ctx.fillText("Flechas · WASD · Destello = brillo · P pausa · F pantalla", 360, 535);
    }

    ctx.fillStyle = COLORS.yellow;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    roundedRect(205, 552, 310, 72, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.font = "800 18px Metropolis, Avenir Next, sans-serif";
    ctx.fillText(isPaused ? "CONTINUAR" : isMenu ? "EMPEZAR" : "JUGAR OTRA VEZ", 360, 588);
    ctx.font = "600 12px Metropolis, Avenir Next, sans-serif";
    ctx.fillText("Enter · Espacio · Toca aquí", 360, 654);
    ctx.restore();
  }

  function draw() {
    // El fondo opaco repinta toda la superficie; evitar clearRect previene un
    // destello negro entre cuadros en navegadores que difieren el raster 2D.
    drawBackground();
    drawHud();
    drawMaze();
    drawControls();
    drawMessage();
    drawOverlay();
    if (externalClock) ctx.getImageData(0, 0, 1, 1);
  }

  function setDirection(direction) {
    if (state.mode === "menu" || state.mode === "gameover" || state.mode === "won") return;
    if (state.mode === "paused") return;
    state.player.queued = direction;
    if (
      state.player.cellX === state.player.nextX &&
      state.player.cellY === state.player.nextY &&
      canMove(state.player, direction)
    ) {
      state.player.direction = direction;
    }
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function distanceTo(point, x, y) {
    return Math.hypot(point.x - x, point.y - y);
  }

  function handlePointer(event) {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    const point = canvasPoint(event);

    if (state.mode !== "playing") {
      if (point.x >= 190 && point.x <= 530 && point.y >= 530 && point.y <= 640) {
        if (state.mode === "paused") togglePause();
        else startGame();
      }
      return;
    }

    if (point.x >= 520 && point.x <= 606 && point.y >= 12 && point.y <= 82) {
      togglePause();
      return;
    }
    if (point.x >= 604 && point.x <= 700 && point.y >= 12 && point.y <= 82) {
      restartGame();
      return;
    }

    const touchControls = [
      { direction: DIRECTIONS.up, x: 540, y: 692 },
      { direction: DIRECTIONS.left, x: 492, y: 744 },
      { direction: DIRECTIONS.right, x: 588, y: 744 },
      { direction: DIRECTIONS.down, x: 540, y: 796 },
    ];
    const chosen = touchControls.find((control) => distanceTo(point, control.x, control.y) <= 45);
    if (chosen) setDirection(chosen.direction);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await canvas.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      showMessage("PANTALLA NO DISPONIBLE", 1);
    }
  }

  function handleKey(event) {
    const key = event.key.toLowerCase();
    const directionByKey = {
      arrowleft: DIRECTIONS.left,
      a: DIRECTIONS.left,
      arrowright: DIRECTIONS.right,
      d: DIRECTIONS.right,
      arrowup: DIRECTIONS.up,
      w: DIRECTIONS.up,
      arrowdown: DIRECTIONS.down,
      s: DIRECTIONS.down,
    };
    if (directionByKey[key]) {
      event.preventDefault();
      setDirection(directionByKey[key]);
      return;
    }
    if (key === "enter" || key === " ") {
      event.preventDefault();
      if (state.mode === "paused") togglePause();
      else if (state.mode !== "playing") startGame();
      return;
    }
    if (key === "p") {
      event.preventDefault();
      togglePause();
    } else if (key === "r") {
      event.preventDefault();
      restartGame();
    } else if (key === "f") {
      event.preventDefault();
      toggleFullscreen();
    }
  }

  function renderGameToText() {
    const player = actorPoint(state.player);
    const movementCell = state.player.progress > 0
      ? { x: state.player.nextX, y: state.player.nextY }
      : { x: state.player.cellX, y: state.player.cellY };
    const legalMoves = DIRECTION_LIST
      .filter((direction) => isWalkable(movementCell.x + direction.x, movementCell.y + direction.y))
      .map((direction) => direction.name);
    const sortedBeans = [...state.beans.values()]
      .map((bean) => ({
        x: bean.x,
        y: bean.y,
        distance: Math.abs(bean.x - player.x) + Math.abs(bean.y - player.y),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10)
      .map(({ x, y }) => ({ x, y }));

    return JSON.stringify({
      coordinate_system: "maze cells; origin at top-left; x increases right, y increases down",
      mode: state.mode,
      objective: "collect every coffee bean while avoiding Bruma, Vaho and Nimbo",
      maze: MAP,
      player: {
        x: Number(player.x.toFixed(2)),
        y: Number(player.y.toFixed(2)),
        direction: state.player.direction.name,
        queued_direction: state.player.queued.name,
        glow_seconds: Number(state.power.toFixed(2)),
      },
      clouds: state.clouds.map((cloud) => {
        const point = actorPoint(cloud);
        return {
          name: cloud.name,
          kind: cloud.kind,
          state: state.power > 0 ? "bright" : "chasing",
          x: Number(point.x.toFixed(2)),
          y: Number(point.y.toFixed(2)),
          direction: cloud.direction.name,
        };
      }),
      score: state.score,
      best_score: state.best,
      lives: state.lives,
      elapsed_seconds: Number(state.elapsed.toFixed(2)),
      freeze_seconds: Number(state.freeze.toFixed(2)),
      message: state.messageTime > 0 ? state.message : "",
      legal_moves: legalMoves,
      next_action:
        state.mode === "menu"
          ? "press Enter or Space to start"
          : state.mode === "paused"
            ? "press P, Enter or Space to continue"
            : state.mode === "playing"
              ? "choose one legal move"
              : "press Enter or Space to play again",
      collectibles: {
        beans_remaining: state.beans.size,
        nearest_beans: sortedBeans,
        glow_sparks: [...state.sparks.values()],
      },
      controls: "arrows/WASD move; P pause; R restart; F fullscreen; touch pad is inside the canvas",
      moodi_assets: Object.fromEntries(
        Object.entries(moodiSprites).map(([name, sprite]) => [name, spriteIsReady(sprite)])
      ),
    });
  }

  function animationLoop(timestamp) {
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;
    if (!externalClock) {
      update(dt);
      draw();
    }
    requestAnimationFrame(animationLoop);
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (milliseconds) => {
    externalClock = true;
    const steps = Math.max(1, Math.round(milliseconds / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) update(1 / 60);
    draw();
  };

  if (new URLSearchParams(window.location.search).has("test")) {
    window.__moodiTest = {
      win() {
        state.beans.clear();
        collectAtPlayer();
        draw();
      },
      lose() {
        state.lives = 1;
        state.power = 0;
        const cloud = state.clouds[0];
        resetActor(cloud, state.player.cellX, state.player.cellY);
        checkCloudCollisions();
        draw();
      },
      glow() {
        state.power = 7;
        draw();
      },
    };
  }

  canvas.addEventListener("pointerdown", handlePointer, { passive: false });
  window.addEventListener("keydown", handleKey, { passive: false });
  document.querySelectorAll("[data-game-exit]").forEach((link) => {
    link.addEventListener("click", () => trackEvent(`moodi_exit_${link.dataset.gameExit}`));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.mode === "playing") togglePause();
  });
  document.addEventListener("fullscreenchange", () => {
    canvas.focus({ preventScroll: true });
    draw();
  });

  resetGame();
  state.mode = "menu";
  draw();
  requestAnimationFrame(animationLoop);
})();
