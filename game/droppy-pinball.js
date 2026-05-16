(() => {
  const root = document.querySelector("[data-pinball-game]");
  if (!root) return;

  const canvas = root.querySelector("#pinball-canvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  if (
    typeof window.createDroppyBackgroundSystem !== "function" ||
    typeof window.createDroppyEffectsSystem !== "function" ||
    typeof window.createDroppyAudioSystem !== "function" ||
    typeof window.createDroppyPinballRenderer !== "function"
  ) {
    console.warn("[pinball] Missing module bootstrap.");
    return;
  }

  const scoreEl = root.querySelector("[data-pinball-score]");
  const highEl = root.querySelector("[data-pinball-high]");
  const ballsEl = root.querySelector("[data-pinball-balls]");
  const stateEl = root.querySelector("[data-pinball-state]");
  const startOverlay = root.querySelector('[data-pinball-overlay="start"]');
  const pauseOverlay = root.querySelector('[data-pinball-overlay="pause"]');
  const gameoverOverlay = root.querySelector('[data-pinball-overlay="gameover"]');
  const startBtn = root.querySelector("[data-pinball-start]");
  const resumeBtn = root.querySelector("[data-pinball-resume]");
  const restartButtons = Array.from(root.querySelectorAll("[data-pinball-restart]"));
  const pauseBtn = root.querySelector("[data-pinball-pause]");
  const muteBtn = root.querySelector("[data-pinball-mute]");
  const fullscreenBtn = root.querySelector("[data-pinball-fullscreen]");
  const finalScoreEl = root.querySelector("[data-pinball-final-score]");
  const finalHighEl = root.querySelector("[data-pinball-final-high]");
  const controlButtons = Array.from(root.querySelectorAll("[data-pinball-action]"));

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const STORAGE_KEY = "better-mood-pinball-high";
  const CAPTURED_KEY_CODES = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyP", "KeyM", "KeyF", "Enter"]);

  const world = {
    width: 0,
    height: 0,
  };

  const background = window.createDroppyBackgroundSystem({ random: Math.random });
  const effects = window.createDroppyEffectsSystem({ random: Math.random });
  const audio = window.createDroppyAudioSystem();
  const droppyImage = new Image();
  droppyImage.src = "../assets/droppy.PNG";

  const renderer = window.createDroppyPinballRenderer({
    ctx,
    canvas,
    background,
    effects,
    droppyImage,
  });

  const state = {
    mode: "idle",
    running: false,
    score: 0,
    highScore: Number.parseInt(window.localStorage.getItem(STORAGE_KEY) || "0", 10) || 0,
    ballsLeft: 3,
    muted: false,
    waitingLaunch: true,
    launchAssistTime: 0,
    ballSaveTime: 0,
    bumpPulse: 0,
    environmentProgress: 0,
    input: {
      left: false,
      right: false,
    },
    ball: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 10,
    },
    bumpers: [],
    posts: [],
    targets: [],
    walls: [],
    flippers: {
      left: null,
      right: null,
    },
    lastOrbit: {
      left: false,
      right: false,
      center: false,
    },
  };

  let rafId = 0;
  let lastRealNow = 0;
  let isActive = !root.closest("[hidden]");
  const activePointers = new Map();

  root.tabIndex = root.tabIndex >= 0 ? root.tabIndex : 0;

  function focusGame() {
    if (document.activeElement instanceof HTMLElement && root.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    root.focus({ preventScroll: true });
  }

  function setOverlay(which) {
    if (startOverlay) startOverlay.hidden = which !== "start";
    if (pauseOverlay) pauseOverlay.hidden = which !== "pause";
    if (gameoverOverlay) gameoverOverlay.hidden = which !== "gameover";
  }

  function setFullscreenMode(enabled) {
    root.classList.toggle("arcade-play--fullscreen", enabled);
    document.body.classList.toggle("droppy-lock", enabled);
    requestAnimationFrame(() => resizeCanvas());
  }

  function toggleFullscreen() {
    setFullscreenMode(!root.classList.contains("arcade-play--fullscreen"));
  }

  function createSegment(ax, ay, bx, by, width, color) {
    return {
      a: { x: world.width * ax, y: world.height * ay },
      b: { x: world.width * bx, y: world.height * by },
      width: world.width * width,
      color,
    };
  }

  function createTable() {
    state.bumpers = [
      { x: world.width * 0.33, y: world.height * 0.27, r: world.width * 0.075, fill: "#ffde00", glow: "rgba(255, 222, 0, 0.42)", label: "B" },
      { x: world.width * 0.63, y: world.height * 0.24, r: world.width * 0.07, fill: "#9fd681", glow: "rgba(159, 214, 129, 0.4)", label: "M" },
      { x: world.width * 0.49, y: world.height * 0.4, r: world.width * 0.082, fill: "#92d5df", glow: "rgba(146, 213, 223, 0.42)", label: "D" },
    ];

    state.targets = [
      { x: world.width * 0.28, y: world.height * 0.13, width: world.width * 0.1, height: world.height * 0.032, label: "C", active: true },
      { x: world.width * 0.5, y: world.height * 0.1, width: world.width * 0.1, height: world.height * 0.032, label: "B", active: true },
      { x: world.width * 0.72, y: world.height * 0.13, width: world.width * 0.1, height: world.height * 0.032, label: "D", active: true },
    ];

    state.posts = [
      { x: world.width * 0.31, y: world.height * 0.73, r: world.width * 0.028, kick: world.width * 0.035 },
      { x: world.width * 0.5, y: world.height * 0.775, r: world.width * 0.034, kick: world.width * 0.05 },
      { x: world.width * 0.69, y: world.height * 0.73, r: world.width * 0.028, kick: world.width * 0.035 },
    ];

    state.walls = [
      createSegment(0.18, 0.12, 0.1, 0.72, 0.018, "rgba(255,255,255,0.92)"),
      createSegment(0.18, 0.12, 0.34, 0.06, 0.018, "rgba(255,255,255,0.92)"),
      createSegment(0.34, 0.06, 0.66, 0.06, 0.018, "rgba(255,255,255,0.92)"),
      createSegment(0.66, 0.06, 0.8, 0.12, 0.018, "rgba(255,255,255,0.92)"),
      createSegment(0.8, 0.12, 0.9, 0.84, 0.018, "rgba(255,255,255,0.92)"),
      createSegment(0.76, 0.16, 0.76, 0.83, 0.014, "rgba(255,255,255,0.74)"),
      createSegment(0.1, 0.72, 0.18, 0.84, 0.018, "rgba(255,255,255,0.92)"),
      createSegment(0.28, 0.68, 0.18, 0.84, 0.016, "rgba(255, 222, 0, 0.92)"),
      createSegment(0.72, 0.68, 0.82, 0.84, 0.016, "rgba(255, 222, 0, 0.92)"),
    ];

    state.flippers.left = createFlipper("left");
    state.flippers.right = createFlipper("right");
    updateFlipperSegment(state.flippers.left);
    updateFlipperSegment(state.flippers.right);
  }

  function createFlipper(side) {
    const isLeft = side === "left";
    const pivot = {
      x: world.width * (isLeft ? 0.38 : 0.62),
      y: world.height * 0.845,
    };
    const restAngle = isLeft ? 0.5 : Math.PI - 0.5;
    const activeAngle = isLeft ? -0.55 : Math.PI + 0.55;
    return {
      side,
      pivot,
      length: world.width * 0.255,
      width: world.width * 0.034,
      angle: restAngle,
      previousAngle: restAngle,
      restAngle,
      activeAngle,
      fill: isLeft ? "#ffde00" : "#f0f4b0",
      pressed: false,
      segment: {
        a: { ...pivot },
        b: { x: 0, y: 0 },
      },
    };
  }

  function updateFlipperSegment(flipper) {
    flipper.segment.a.x = flipper.pivot.x;
    flipper.segment.a.y = flipper.pivot.y;
    flipper.segment.b.x = flipper.pivot.x + Math.cos(flipper.angle) * flipper.length;
    flipper.segment.b.y = flipper.pivot.y + Math.sin(flipper.angle) * flipper.length;
  }

  function setBallAtLaunch() {
    state.ball.x = world.width * 0.83;
    state.ball.y = world.height * 0.82;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.waitingLaunch = true;
    state.launchAssistTime = 0;
    state.ballSaveTime = 0;
  }

  function resetGameState() {
    state.score = 0;
    state.ballsLeft = 3;
    state.bumpPulse = 0;
    state.environmentProgress = 0;
    state.lastOrbit.left = false;
    state.lastOrbit.right = false;
    state.lastOrbit.center = false;
    state.targets.forEach((target) => {
      target.active = true;
    });
    setBallAtLaunch();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const oldWorld = { width: world.width, height: world.height };
    const hadPlayableSize = oldWorld.width >= 40 && oldWorld.height >= 40;
    const preserveBall =
      hadPlayableSize && state.mode === "playing" && !state.waitingLaunch;
    const ballRatio = preserveBall
      ? {
          x: state.ball.x / oldWorld.width,
          y: state.ball.y / oldWorld.height,
          vx: state.ball.vx / oldWorld.width,
          vy: state.ball.vy / oldWorld.height,
        }
      : null;

    if (rect.width < 40 || rect.height < 40) {
      world.width = 360;
      world.height = 560;
      createTable();
      if (ballRatio) {
        state.ball.x = world.width * ballRatio.x;
        state.ball.y = world.height * ballRatio.y;
        state.ball.vx = world.width * ballRatio.vx;
        state.ball.vy = world.height * ballRatio.vy;
      } else {
        setBallAtLaunch();
      }
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    world.width = rect.width;
    world.height = rect.height;
    background.resize(world);
    createTable();
    if (ballRatio) {
      state.ball.x = world.width * ballRatio.x;
      state.ball.y = world.height * ballRatio.y;
      state.ball.vx = world.width * ballRatio.vx;
      state.ball.vy = world.height * ballRatio.vy;
      state.waitingLaunch = false;
    } else {
      setBallAtLaunch();
    }
    draw();
  }

  function awardScore(points, x, y, kind = "bean") {
    state.score += points;
    state.highScore = Math.max(state.highScore, state.score);
    state.bumpPulse = 0.18;
    state.environmentProgress = clamp(state.score / 1200, 0, 1);
    effects.spawnCollectBurst(x, y, kind, Math.max(1, Math.round(state.score / 250)), state.environmentProgress);
    updateHud();
  }

  function applyLaunchVelocity() {
    state.ball.vx = -world.width * 0.2;
    state.ball.vy = -world.height * 1.32;
    state.waitingLaunch = false;
    state.launchAssistTime = 1;
  }

  function launchBall() {
    if (state.mode !== "playing" || !state.waitingLaunch) return;
    focusGame();
    applyLaunchVelocity();
    state.ballSaveTime = 10;
    updateHud();
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (highEl) highEl.textContent = String(state.highScore);
    if (ballsEl) ballsEl.textContent = String(state.ballsLeft);
    if (stateEl) {
      stateEl.textContent =
        state.mode === "playing"
          ? state.waitingLaunch
            ? "Launch"
            : "Live"
          : state.mode === "paused"
            ? "Pausa"
            : state.mode === "gameover"
              ? "Over"
              : "Listo";
    }
    if (pauseBtn) pauseBtn.disabled = state.mode === "idle" || state.mode === "gameover";
    if (muteBtn) muteBtn.textContent = state.muted ? "×" : "♪";
  }

  function saveHighScore() {
    window.localStorage.setItem(STORAGE_KEY, String(state.highScore));
  }

  function startGame() {
    if (!isActive) return;
    focusGame();
    audio.ensureStarted();
    if (!state.muted) {
      audio.resume();
    }
    resetGameState();
    state.mode = "playing";
    state.running = true;
    setOverlay(null);
    updateHud();
    draw();
    startLoop();
  }

  function endGame() {
    state.mode = "gameover";
    state.running = false;
    cancelAnimationFrame(rafId);
    saveHighScore();
    setOverlay("gameover");
    setFullscreenMode(false);
    if (finalScoreEl) finalScoreEl.textContent = String(state.score);
    if (finalHighEl) finalHighEl.textContent = String(state.highScore);
    updateHud();
    draw();
  }

  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    state.input.left = false;
    state.input.right = false;
    state.running = false;
    cancelAnimationFrame(rafId);
    if (!state.muted) {
      audio.suspend();
    }
    setOverlay("pause");
    updateHud();
    draw();
  }

  function resumeGame() {
    if (!isActive || state.mode !== "paused") return;
    focusGame();
    state.mode = "playing";
    state.running = true;
    if (!state.muted) {
      audio.resume();
    }
    setOverlay(null);
    updateHud();
    startLoop();
  }

  function startLoop() {
    cancelAnimationFrame(rafId);
    lastRealNow = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function reflectVelocity(nx, ny, bounce = 0.92) {
    const velocityAlongNormal = state.ball.vx * nx + state.ball.vy * ny;
    if (velocityAlongNormal >= 0) return;
    const impulse = -(1 + bounce) * velocityAlongNormal;
    state.ball.vx += impulse * nx;
    state.ball.vy += impulse * ny;
  }

  function collideCircle(target, extraImpulse = 0) {
    const dx = state.ball.x - target.x;
    const dy = state.ball.y - target.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = state.ball.r + target.r;
    if (dist >= minDist) return false;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    state.ball.x += nx * overlap;
    state.ball.y += ny * overlap;
    reflectVelocity(nx, ny, 0.96);
    state.ball.vx += nx * extraImpulse;
    state.ball.vy += ny * extraImpulse;
    return true;
  }

  function collideSegment(segment, radius = 0, boost = 0) {
    const abx = segment.b.x - segment.a.x;
    const aby = segment.b.y - segment.a.y;
    const apx = state.ball.x - segment.a.x;
    const apy = state.ball.y - segment.a.y;
    const abLengthSq = abx * abx + aby * aby || 1;
    const t = clamp((apx * abx + apy * aby) / abLengthSq, 0, 1);
    const closestX = segment.a.x + abx * t;
    const closestY = segment.a.y + aby * t;
    const dx = state.ball.x - closestX;
    const dy = state.ball.y - closestY;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = state.ball.r + radius;
    if (dist >= minDist) return false;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    state.ball.x += nx * overlap;
    state.ball.y += ny * overlap;
    reflectVelocity(nx, ny, 0.9);
    if (boost) {
      state.ball.vx += nx * boost;
      state.ball.vy += ny * boost;
    }
    return true;
  }

  function updateFlippers(dt) {
    [state.flippers.left, state.flippers.right].forEach((flipper) => {
      flipper.previousAngle = flipper.angle;
      const pressed = flipper.side === "left" ? state.input.left : state.input.right;
      flipper.pressed = pressed;
      const target = pressed ? flipper.activeAngle : flipper.restAngle;
      flipper.angle += (target - flipper.angle) * clamp(dt * 22, 0, 1);
      updateFlipperSegment(flipper);
    });
  }

  function scoreLanes() {
    const leftOrbit = state.ball.x < world.width * 0.2 && state.ball.y < world.height * 0.32;
    if (leftOrbit && !state.lastOrbit.left) {
      awardScore(35, state.ball.x, state.ball.y, "adaptogen");
    }
    state.lastOrbit.left = leftOrbit;

    const rightOrbit = state.ball.x > world.width * 0.72 && state.ball.y < world.height * 0.32;
    if (rightOrbit && !state.lastOrbit.right) {
      awardScore(35, state.ball.x, state.ball.y, "adaptogen");
    }
    state.lastOrbit.right = rightOrbit;

    const centerLane = state.ball.x > world.width * 0.38 && state.ball.x < world.width * 0.62 && state.ball.y < world.height * 0.18;
    if (centerLane && !state.lastOrbit.center) {
      awardScore(50, state.ball.x, state.ball.y, "spring");
      state.targets.forEach((target) => {
        target.active = true;
      });
    }
    state.lastOrbit.center = centerLane;

    state.targets.forEach((target) => {
      const withinX = Math.abs(state.ball.x - target.x) <= target.width * 0.6;
      const withinY = Math.abs(state.ball.y - target.y) <= target.height * 0.9;
      if (target.active && withinX && withinY) {
        target.active = false;
        awardScore(20, target.x, target.y, "bean");
      }
    });
  }

  function loseBall() {
    if (state.ballSaveTime > 0) {
      setBallAtLaunch();
      applyLaunchVelocity();
      state.ballSaveTime = Math.max(state.ballSaveTime - 2, 0);
      updateHud();
      return;
    }
    state.ballsLeft -= 1;
    if (state.ballsLeft <= 0) {
      endGame();
      return;
    }
    setBallAtLaunch();
    state.lastOrbit.left = false;
    state.lastOrbit.right = false;
    state.lastOrbit.center = false;
    updateHud();
  }

  function update(dt) {
    background.update(
      dt,
      {
        flowIntensity: clamp(state.score / 1500, 0, 1),
        speed: 160 + Math.hypot(state.ball.vx, state.ball.vy) * 0.1,
        environmentProgress: state.environmentProgress,
      },
      world
    );

    effects.update(dt, {
      runner: {
        x: state.ball.x - state.ball.r,
        y: state.ball.y - state.ball.r,
        width: state.ball.r * 2,
        height: state.ball.r * 2,
      },
      flowIntensity: clamp(state.score / 1500, 0, 1),
    });

    state.bumpPulse = Math.max(0, state.bumpPulse - dt);
    audio.setIntensity(state.muted ? 0 : clamp(0.24 + state.environmentProgress * 0.54, 0, 1));

    if (state.mode !== "playing") return;

    state.ballSaveTime = Math.max(0, state.ballSaveTime - dt);

    updateFlippers(dt);

    if (state.waitingLaunch) {
      state.ball.x = world.width * 0.83;
      state.ball.y = world.height * 0.82;
      return;
    }

    const substeps = 2;
    const stepDt = dt / substeps;

    for (let i = 0; i < substeps; i += 1) {
      if (state.launchAssistTime > 0) {
        state.launchAssistTime = Math.max(0, state.launchAssistTime - stepDt);
        if (state.ball.x > world.width * 0.58 && state.ball.y < world.height * 0.36) {
          state.ball.vx -= world.width * 2.5 * stepDt;
          state.ball.vy -= world.height * 0.18 * stepDt;
        }
      }

      state.ball.vy += world.height * 0.82 * stepDt;
      state.ball.vx *= 0.999;
      state.ball.vy *= 0.999;
      state.ball.x += state.ball.vx * stepDt;
      state.ball.y += state.ball.vy * stepDt;

      state.walls.forEach((segment) => {
        collideSegment(segment, segment.width * 0.5);
      });

      [state.flippers.left, state.flippers.right].forEach((flipper) => {
        const fling = Math.abs(flipper.angle - flipper.previousAngle) * world.width * 10;
        const boost = flipper.pressed ? fling : 0;
        if (collideSegment(flipper.segment, flipper.width * 0.54, boost)) {
          if (flipper.pressed) {
            state.ball.vy -= world.height * 0.16;
          }
        }
      });

      state.bumpers.forEach((bumper) => {
        if (collideCircle(bumper, world.width * 0.08)) {
          awardScore(15, bumper.x, bumper.y, "spring");
        }
      });

      state.posts.forEach((post) => {
        collideCircle(post, post.kick);
      });

      scoreLanes();

      if (state.ball.y - state.ball.r > world.height + 20) {
        loseBall();
        return;
      }
    }

    updateHud();
  }

  function getSnapshot() {
    return {
      ball: state.ball,
      bumpers: state.bumpers,
      posts: state.posts,
      flippers: [state.flippers.left, state.flippers.right],
      walls: state.walls,
      targets: state.targets,
      bumpPulse: state.bumpPulse,
      waitingLaunch: state.waitingLaunch,
      modeLabel:
        state.mode === "playing"
          ? state.waitingLaunch
            ? "Lista para launch"
            : "Pinball en juego"
          : state.mode === "paused"
            ? "Pausa"
            : state.mode === "gameover"
              ? "Fin de partida"
              : "Better Mood Arcade",
      controlsLabel: "A / D · Flechas · Space",
      environmentProgress: state.environmentProgress,
    };
  }

  function draw() {
    if (world.width < 40 || world.height < 40) return;
    renderer.draw(world, getSnapshot());
  }

  function loop(now) {
    if (!state.running) return;
    const dt = Math.min((now - lastRealNow) / 1000, 0.05);
    lastRealNow = now;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  async function advanceSimulation(ms) {
    const step = 1000 / 60;
    let remaining = Math.max(step, ms);
    while (remaining > 0) {
      update(step / 1000);
      remaining -= step;
    }
    draw();
  }

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      waitingLaunch: state.waitingLaunch,
      score: state.score,
      highScore: state.highScore,
      ballsLeft: state.ballsLeft,
      ball: {
        x: Number(state.ball.x.toFixed(1)),
        y: Number(state.ball.y.toFixed(1)),
        vx: Number(state.ball.vx.toFixed(1)),
        vy: Number(state.ball.vy.toFixed(1)),
        r: state.ball.r,
      },
      bumpers: state.bumpers.map((bumper) => ({
        x: Number(bumper.x.toFixed(1)),
        y: Number(bumper.y.toFixed(1)),
        r: Number(bumper.r.toFixed(1)),
      })),
      posts: state.posts.map((post) => ({
        x: Number(post.x.toFixed(1)),
        y: Number(post.y.toFixed(1)),
        r: Number(post.r.toFixed(1)),
        kick: Number(post.kick.toFixed(1)),
      })),
      flippers: {
        left: Number(state.flippers.left.angle.toFixed(2)),
        right: Number(state.flippers.right.angle.toFixed(2)),
      },
      origin: "top-left, x-right, y-down",
    });
  }

  function pressControl(key, pressed) {
    if (key === "left") {
      state.input.left = pressed;
    } else if (key === "right") {
      state.input.right = pressed;
    }
  }

  function handleAction(action) {
    if (!isActive) return;
    focusGame();
    if (action === "launch") {
      launchBall();
      return;
    }
    pressControl(action, true);
    window.setTimeout(() => pressControl(action, false), 120);
  }

  function toggleMute() {
    state.muted = !state.muted;
    if (state.muted) {
      audio.suspend();
    } else if (state.mode === "playing") {
      audio.resume();
    }
    updateHud();
  }

  document.addEventListener("keydown", (event) => {
    if (!isActive) return;
    if (CAPTURED_KEY_CODES.has(event.code) && state.mode !== "idle") {
      event.preventDefault();
    }
    if (state.mode === "idle" && (event.code === "Enter" || event.code === "Space")) {
      event.preventDefault();
      startGame();
      return;
    }
    if (event.code === "KeyP") {
      event.preventDefault();
      if (state.mode === "playing") pauseGame();
      else if (state.mode === "paused") resumeGame();
      return;
    }
    if (event.code === "KeyM") {
      event.preventDefault();
      toggleMute();
      return;
    }
    if (event.code === "KeyF") {
      event.preventDefault();
      toggleFullscreen();
      return;
    }
    if (state.mode !== "playing") return;
    switch (event.code) {
      case "ArrowLeft":
      case "KeyA":
        event.preventDefault();
        pressControl("left", true);
        break;
      case "ArrowRight":
      case "KeyD":
        event.preventDefault();
        pressControl("right", true);
        break;
      case "Space":
      case "ArrowUp":
        event.preventDefault();
        launchBall();
        break;
      default:
        break;
    }
  });

  document.addEventListener("keyup", (event) => {
    if (!isActive) return;
    if (CAPTURED_KEY_CODES.has(event.code)) {
      event.preventDefault();
    }
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      pressControl("left", false);
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      pressControl("right", false);
    }
  });

  controlButtons.forEach((button) => {
    const action = button.dataset.pinballAction;
    if (!action) return;
    if (action === "launch") {
      button.addEventListener("click", () => {
        audio.ensureStarted();
        if (!state.muted) {
          audio.resume();
        }
        handleAction(action);
      });
      return;
    }
    const release = (event) => {
      event?.preventDefault?.();
      pressControl(action, false);
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      audio.ensureStarted();
      if (!state.muted) {
        audio.resume();
      }
      pressControl(action, true);
      button.setPointerCapture?.(event.pointerId);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!isActive) return;
    event.preventDefault();
    audio.ensureStarted();
    if (!state.muted) {
      audio.resume();
    }
    focusGame();
    if (state.mode === "idle") {
      startGame();
      return;
    }
    if (state.mode === "paused") {
      resumeGame();
      return;
    }
    if (state.mode !== "playing") return;
    if (state.waitingLaunch) {
      launchBall();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const side = event.clientX - rect.left < rect.width / 2 ? "left" : "right";
    activePointers.set(event.pointerId, side);
    canvas.setPointerCapture?.(event.pointerId);
    pressControl(side, true);
  });

  function releaseCanvasPointer(event) {
    const side = activePointers.get(event.pointerId);
    if (!side) return;
    event.preventDefault();
    activePointers.delete(event.pointerId);
    pressControl(side, false);
  }

  canvas.addEventListener("pointerup", releaseCanvasPointer);
  canvas.addEventListener("pointercancel", releaseCanvasPointer);
  canvas.addEventListener("pointerleave", releaseCanvasPointer);

  startBtn?.addEventListener("click", startGame);
  resumeBtn?.addEventListener("click", resumeGame);
  restartButtons.forEach((button) => button.addEventListener("click", startGame));
  pauseBtn?.addEventListener("click", () => {
    if (state.mode === "playing") pauseGame();
    else if (state.mode === "paused") resumeGame();
  });
  muteBtn?.addEventListener("click", toggleMute);
  fullscreenBtn?.addEventListener("click", toggleFullscreen);

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      state.input.left = false;
      state.input.right = false;
      audio.suspend();
    } else if (state.mode === "playing" && !state.muted) {
      audio.resume();
    }
  });

  const controller = {
    gameKey: root.dataset.gameKey || "pinball",
    renderGameToText,
    advanceTime: (ms) => advanceSimulation(ms),
    setActive(next) {
      isActive = Boolean(next);
      if (!isActive && state.mode === "playing") {
        pauseGame();
      }
      if (isActive) {
        requestAnimationFrame(() => resizeCanvas());
        window.render_game_to_text = renderGameToText;
        window.advanceTime = (ms) => advanceSimulation(ms);
      }
    },
  };

  root.__arcadeStage = controller;
  if (isActive) {
    window.render_game_to_text = renderGameToText;
    window.advanceTime = (ms) => advanceSimulation(ms);
  }

  resizeCanvas();
  updateHud();
  setOverlay("start");
  draw();
})();
