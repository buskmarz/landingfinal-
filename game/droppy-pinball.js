(() => {
  const root = document.querySelector("[data-pinball-game]");
  if (!root || root.__droppyPinballInitialized) return;
  root.__droppyPinballInitialized = true;

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
  const hypot = Math.hypot;
  const STORAGE_KEY = "better-mood-pinball-high";
  const CAPTURED_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "Space",
    "KeyA",
    "KeyD",
    "KeyP",
    "KeyM",
    "KeyF",
    "Enter",
  ]);
  const MODE = Object.freeze({
    IDLE: "idle",
    READY: "readyToLaunch",
    LAUNCHING: "launching",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "gameOver",
  });
  const ACTIVE_MODES = new Set([MODE.READY, MODE.LAUNCHING, MODE.PLAYING]);

  const world = { width: 0, height: 0 };
  const bounds = { left: 0, right: 0, top: 0, bottom: 0, drainLeft: 0, drainRight: 0 };
  const launchLane = { x: 0, top: 0, bottom: 0, exitY: 0 };

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
    mode: MODE.IDLE,
    modeBeforePause: MODE.READY,
    running: false,
    score: 0,
    highScore: Number.parseInt(window.localStorage.getItem(STORAGE_KEY) || "0", 10) || 0,
    ballsLeft: 3,
    muted: false,
    ballSaveTime: 0,
    launchTimer: 0,
    launchExitDone: false,
    flipperCooldown: 0,
    bumpPulse: 0,
    environmentProgress: 0,
    input: { left: false, right: false },
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: 10 },
    bumpers: [],
    posts: [],
    targets: [],
    walls: [],
    flippers: { left: null, right: null },
    lastOrbit: { left: false, right: false, center: false },
  };

  let rafId = 0;
  let lastRealNow = 0;
  let isActive = !root.closest("[hidden]");
  const pointerSides = new Map();

  root.tabIndex = root.tabIndex >= 0 ? root.tabIndex : 0;

  function isReady() {
    return state.mode === MODE.READY;
  }

  function isLive() {
    return state.mode === MODE.LAUNCHING || state.mode === MODE.PLAYING;
  }

  function isActiveMode() {
    return ACTIVE_MODES.has(state.mode);
  }

  function releaseControls() {
    state.input.left = false;
    state.input.right = false;
    pointerSides.clear();
  }

  function focusGame() {
    if (document.activeElement instanceof HTMLElement && root.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    root.focus({ preventScroll: true });
  }

  function capturePointer(target, pointerId) {
    if (!target?.setPointerCapture || pointerId == null) return;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail on interrupted synthetic events. The control remains active without it.
    }
  }

  function setOverlay(which) {
    if (startOverlay) startOverlay.hidden = which !== "start";
    if (pauseOverlay) pauseOverlay.hidden = which !== "pause";
    if (gameoverOverlay) gameoverOverlay.hidden = which !== "gameover";
  }

  function setFullscreenMode(enabled) {
    root.classList.toggle("arcade-play--fullscreen", enabled);
    document.body.classList.toggle("droppy-lock", enabled);
    requestAnimationFrame(resizeCanvas);
  }

  function toggleFullscreen() {
    setFullscreenMode(!root.classList.contains("arcade-play--fullscreen"));
  }

  function makeSegment(ax, ay, bx, by, width, color, kind = "wall") {
    return {
      kind,
      a: { x: world.width * ax, y: world.height * ay },
      b: { x: world.width * bx, y: world.height * by },
      width: world.width * width,
      color,
    };
  }

  function createFlipper(side) {
    const isLeft = side === "left";
    const pivot = {
      x: world.width * (isLeft ? 0.31 : 0.69),
      y: world.height * 0.84,
    };
    return {
      side,
      pivot,
      length: world.width * 0.265,
      width: world.width * 0.042,
      restAngle: isLeft ? -0.18 : Math.PI + 0.18,
      activeAngle: isLeft ? -0.93 : Math.PI + 0.93,
      angle: isLeft ? -0.18 : Math.PI + 0.18,
      previousAngle: isLeft ? -0.18 : Math.PI + 0.18,
      angularVelocity: 0,
      pressed: false,
      fill: isLeft ? "#ffde00" : "#f0f4b0",
      segment: { a: { ...pivot }, b: { x: 0, y: 0 } },
    };
  }

  function updateFlipperSegment(flipper) {
    flipper.segment.a.x = flipper.pivot.x;
    flipper.segment.a.y = flipper.pivot.y;
    flipper.segment.b.x = flipper.pivot.x + Math.cos(flipper.angle) * flipper.length;
    flipper.segment.b.y = flipper.pivot.y + Math.sin(flipper.angle) * flipper.length;
  }

  function configureTable() {
    bounds.left = world.width * 0.08;
    bounds.right = world.width * 0.92;
    bounds.top = world.height * 0.045;
    bounds.bottom = world.height * 0.94;
    bounds.drainLeft = world.width * 0.39;
    bounds.drainRight = world.width * 0.61;

    launchLane.x = world.width * 0.84;
    launchLane.top = world.height * 0.12;
    launchLane.bottom = world.height * 0.86;
    launchLane.exitY = world.height * 0.17;

    state.ball.r = clamp(world.width * 0.018, 8, 13);
    state.bumpers = [
      { x: world.width * 0.32, y: world.height * 0.25, r: world.width * 0.07, fill: "#ffde00", glow: "rgba(255, 222, 0, 0.42)", label: "B" },
      { x: world.width * 0.64, y: world.height * 0.22, r: world.width * 0.064, fill: "#9fd681", glow: "rgba(159, 214, 129, 0.4)", label: "M" },
      { x: world.width * 0.5, y: world.height * 0.39, r: world.width * 0.072, fill: "#92d5df", glow: "rgba(146, 213, 223, 0.42)", label: "D" },
    ];
    state.posts = [
      { x: world.width * 0.3, y: world.height * 0.72, r: world.width * 0.028, kick: world.width * 0.035 },
      { x: world.width * 0.5, y: world.height * 0.775, r: world.width * 0.032, kick: world.width * 0.04 },
      { x: world.width * 0.7, y: world.height * 0.72, r: world.width * 0.028, kick: world.width * 0.035 },
    ];
    state.targets = [
      { x: world.width * 0.29, y: world.height * 0.13, width: world.width * 0.1, height: world.height * 0.032, label: "C", active: true },
      { x: world.width * 0.5, y: world.height * 0.1, width: world.width * 0.1, height: world.height * 0.032, label: "B", active: true },
      { x: world.width * 0.71, y: world.height * 0.13, width: world.width * 0.1, height: world.height * 0.032, label: "D", active: true },
    ];
    state.walls = [
      makeSegment(0.16, 0.13, 0.1, 0.72, 0.018, "rgba(255,255,255,0.92)"),
      makeSegment(0.16, 0.13, 0.34, 0.055, 0.018, "rgba(255,255,255,0.92)"),
      makeSegment(0.34, 0.055, 0.64, 0.055, 0.018, "rgba(255,255,255,0.92)"),
      makeSegment(0.64, 0.055, 0.78, 0.12, 0.018, "rgba(255,255,255,0.92)"),
      makeSegment(0.78, 0.12, 0.9, 0.84, 0.018, "rgba(255,255,255,0.92)"),
      makeSegment(0.76, 0.18, 0.76, 0.83, 0.014, "rgba(255,255,255,0.74)", "lane"),
      makeSegment(0.1, 0.72, 0.18, 0.84, 0.018, "rgba(255,255,255,0.92)"),
      makeSegment(0.28, 0.68, 0.18, 0.84, 0.016, "rgba(255, 222, 0, 0.92)", "sling"),
      makeSegment(0.72, 0.68, 0.82, 0.84, 0.016, "rgba(255, 222, 0, 0.92)", "sling"),
    ];
    state.flippers.left = createFlipper("left");
    state.flippers.right = createFlipper("right");
    updateFlipperSegment(state.flippers.left);
    updateFlipperSegment(state.flippers.right);
  }

  function setBallReady() {
    state.ball.x = launchLane.x;
    state.ball.y = world.height * 0.82;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.launchTimer = 0;
    state.launchExitDone = false;
    state.ballSaveTime = 0;
    state.flipperCooldown = 0;
    releaseControls();
  }

  function setReadyToLaunch() {
    setBallReady();
    state.mode = MODE.READY;
    state.running = true;
    updateHud();
    startLoop();
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
    setReadyToLaunch();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const old = { width: world.width, height: world.height };
    const preserveLiveBall = old.width > 40 && old.height > 40 && isLive();
    const ballRatio = preserveLiveBall
      ? {
          x: state.ball.x / old.width,
          y: state.ball.y / old.height,
          vx: state.ball.vx / old.width,
          vy: state.ball.vy / old.height,
        }
      : null;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = Math.max(rect.width || 360, 320);
    const nextHeight = Math.max(rect.height || 560, 480);
    canvas.width = nextWidth * dpr;
    canvas.height = nextHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    world.width = nextWidth;
    world.height = nextHeight;
    background.resize(world);
    configureTable();

    if (ballRatio) {
      state.ball.x = clamp(world.width * ballRatio.x, bounds.left, bounds.right);
      state.ball.y = clamp(world.height * ballRatio.y, bounds.top, bounds.bottom);
      state.ball.vx = world.width * ballRatio.vx;
      state.ball.vy = world.height * ballRatio.vy;
    } else if (isReady() || state.mode === MODE.IDLE || state.mode === MODE.GAME_OVER) {
      setBallReady();
    }
    draw();
  }

  function awardScore(points, x, y, kind = "bean") {
    state.score += points;
    state.highScore = Math.max(state.highScore, state.score);
    state.bumpPulse = 0.18;
    state.environmentProgress = clamp(state.score / 1400, 0, 1);
    effects.spawnCollectBurst(x, y, kind, Math.max(1, Math.round(points / 15)), state.environmentProgress);
    updateHud();
  }

  function launchBall() {
    if (!isReady()) return false;
    focusGame();
    audio.ensureStarted();
    if (!state.muted) audio.resume();
    setBallReady();
    state.mode = MODE.LAUNCHING;
    state.running = true;
    state.launchTimer = 0.9;
    state.launchExitDone = false;
    state.ballSaveTime = 7;
    state.ball.vx = -world.width * 0.38;
    state.ball.vy = -world.height * 1.55;
    if (hypot(state.ball.vx, state.ball.vy) < world.height * 0.9) {
      state.ball.vx = -world.width * 0.46;
      state.ball.vy = -world.height * 1.7;
    }
    setOverlay(null);
    updateHud();
    startLoop();
    return true;
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (highEl) highEl.textContent = String(state.highScore);
    if (ballsEl) ballsEl.textContent = String(state.ballsLeft);
    if (stateEl) {
      stateEl.textContent =
        state.mode === MODE.READY
          ? "Launch"
          : state.mode === MODE.LAUNCHING || state.mode === MODE.PLAYING
            ? "Live"
            : state.mode === MODE.PAUSED
              ? "Pausa"
              : state.mode === MODE.GAME_OVER
                ? "Over"
                : "Listo";
    }
    if (pauseBtn) pauseBtn.disabled = state.mode === MODE.IDLE || state.mode === MODE.GAME_OVER;
    if (muteBtn) muteBtn.textContent = state.muted ? "×" : "♪";
  }

  function saveHighScore() {
    window.localStorage.setItem(STORAGE_KEY, String(state.highScore));
  }

  function startGame() {
    if (!isActive) return;
    focusGame();
    audio.ensureStarted();
    if (!state.muted) audio.resume();
    resetGameState();
    setOverlay(null);
    updateHud();
    draw();
  }

  function endGame() {
    state.mode = MODE.GAME_OVER;
    state.running = false;
    releaseControls();
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
    if (!isActiveMode()) return;
    state.modeBeforePause = state.mode;
    state.mode = MODE.PAUSED;
    state.running = false;
    releaseControls();
    cancelAnimationFrame(rafId);
    if (!state.muted) audio.suspend();
    setOverlay("pause");
    updateHud();
    draw();
  }

  function resumeGame() {
    if (!isActive || state.mode !== MODE.PAUSED) return;
    focusGame();
    state.mode = state.modeBeforePause || MODE.READY;
    state.running = true;
    if (!state.muted) audio.resume();
    setOverlay(null);
    updateHud();
    startLoop();
  }

  function startLoop() {
    cancelAnimationFrame(rafId);
    lastRealNow = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function reflect(nx, ny, bounce = 0.86) {
    const dot = state.ball.vx * nx + state.ball.vy * ny;
    if (dot >= 0) return;
    state.ball.vx -= (1 + bounce) * dot * nx;
    state.ball.vy -= (1 + bounce) * dot * ny;
  }

  function collideCircle(circle, impulse = 0) {
    const dx = state.ball.x - circle.x;
    const dy = state.ball.y - circle.y;
    const dist = hypot(dx, dy) || 0.0001;
    const minDist = state.ball.r + circle.r;
    if (dist >= minDist) return false;
    const nx = dx / dist;
    const ny = dy / dist;
    state.ball.x += nx * (minDist - dist + 0.1);
    state.ball.y += ny * (minDist - dist + 0.1);
    reflect(nx, ny, 0.92);
    state.ball.vx += nx * impulse;
    state.ball.vy += ny * impulse;
    return true;
  }

  function collideSegment(segment, radius = 0, boost = 0) {
    const abx = segment.b.x - segment.a.x;
    const aby = segment.b.y - segment.a.y;
    const apx = state.ball.x - segment.a.x;
    const apy = state.ball.y - segment.a.y;
    const abLenSq = abx * abx + aby * aby || 1;
    const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
    const cx = segment.a.x + abx * t;
    const cy = segment.a.y + aby * t;
    const dx = state.ball.x - cx;
    const dy = state.ball.y - cy;
    const dist = hypot(dx, dy) || 0.0001;
    const minDist = state.ball.r + radius;
    if (dist >= minDist) return false;
    const nx = dx / dist;
    const ny = dy / dist;
    state.ball.x += nx * (minDist - dist + 0.15);
    state.ball.y += ny * (minDist - dist + 0.15);
    reflect(nx, ny, 0.88);
    if (boost) {
      state.ball.vx += nx * boost;
      state.ball.vy += ny * boost;
    }
    return true;
  }

  function updateFlippers(dt) {
    [state.flippers.left, state.flippers.right].forEach((flipper) => {
      flipper.previousAngle = flipper.angle;
      flipper.pressed = flipper.side === "left" ? state.input.left : state.input.right;
      const target = flipper.pressed ? flipper.activeAngle : flipper.restAngle;
      const nextAngle = flipper.angle + (target - flipper.angle) * clamp(dt * 26, 0, 1);
      flipper.angularVelocity = (nextAngle - flipper.angle) / Math.max(dt, 0.001);
      flipper.angle = nextAngle;
      updateFlipperSegment(flipper);
    });
  }

  function applyFlipperSkillShot(flipper) {
    if (!flipper.pressed || state.flipperCooldown > 0 || !isLive()) return false;
    const isLeft = flipper.side === "left";
    const xMin = world.width * (isLeft ? 0.11 : 0.43);
    const xMax = world.width * (isLeft ? 0.57 : 0.89);
    const yMin = world.height * 0.66;
    const yMax = world.height * 0.91;
    if (state.ball.x < xMin || state.ball.x > xMax || state.ball.y < yMin || state.ball.y > yMax) return false;
    if (state.ball.vy < -world.height * 0.35) return false;

    const centerPull = (world.width * 0.5 - state.ball.x) * 0.65;
    state.ball.y = Math.min(state.ball.y, world.height * 0.78);
    state.ball.vx = (isLeft ? world.width * 0.42 : -world.width * 0.42) + centerPull;
    state.ball.vy = -world.height * 1.22;
    state.flipperCooldown = 0.14;
    awardScore(5, state.ball.x, state.ball.y, "bean");
    return true;
  }

  function applyPlayfieldBounds() {
    const ball = state.ball;
    if (ball.x - ball.r < bounds.left) {
      ball.x = bounds.left + ball.r;
      reflect(1, 0, 0.82);
    }
    if (ball.x + ball.r > bounds.right) {
      ball.x = bounds.right - ball.r;
      reflect(-1, 0, 0.82);
    }
    if (ball.y - ball.r < bounds.top) {
      ball.y = bounds.top + ball.r;
      reflect(0, 1, 0.82);
    }

    const nearBottom = ball.y + ball.r > bounds.bottom;
    const inDrainGap = ball.x > bounds.drainLeft && ball.x < bounds.drainRight;
    if (nearBottom && !inDrainGap) {
      ball.y = bounds.bottom - ball.r;
      reflect(0, -1, 0.76);
      ball.vx += ball.x < world.width * 0.5 ? world.width * 0.08 : -world.width * 0.08;
    }
  }

  function guideLaunchExit(dt) {
    if (state.mode !== MODE.LAUNCHING) return;
    state.launchTimer = Math.max(0, state.launchTimer - dt);

    // The old table trapped the ball in the right lane. This gate forcibly opens the lane into the field.
    if (!state.launchExitDone && state.ball.y <= launchLane.exitY) {
      state.launchExitDone = true;
      state.ball.x = world.width * 0.72;
      state.ball.y = world.height * 0.16;
      state.ball.vx = -world.width * 0.72;
      state.ball.vy = world.height * 0.18;
      state.mode = MODE.PLAYING;
      awardScore(10, state.ball.x, state.ball.y, "spring");
      return;
    }

    if (!state.launchExitDone && state.launchTimer <= 0.36) {
      state.launchExitDone = true;
      state.ball.x = world.width * 0.7;
      state.ball.y = world.height * 0.2;
      state.ball.vx = -world.width * 0.58;
      state.ball.vy = world.height * 0.12;
      state.mode = MODE.PLAYING;
    }
  }

  function scoreLanes() {
    const leftOrbit = state.ball.x < world.width * 0.2 && state.ball.y < world.height * 0.34;
    if (leftOrbit && !state.lastOrbit.left) awardScore(35, state.ball.x, state.ball.y, "adaptogen");
    state.lastOrbit.left = leftOrbit;

    const rightOrbit = state.ball.x > world.width * 0.7 && state.ball.y < world.height * 0.34;
    if (rightOrbit && !state.lastOrbit.right) awardScore(35, state.ball.x, state.ball.y, "adaptogen");
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
      if (!target.active) return;
      const withinX = Math.abs(state.ball.x - target.x) <= target.width * 0.62;
      const withinY = Math.abs(state.ball.y - target.y) <= target.height;
      if (withinX && withinY) {
        target.active = false;
        state.ball.vy = Math.abs(state.ball.vy) + world.height * 0.25;
        awardScore(20, target.x, target.y, "bean");
      }
    });
  }

  function loseBall() {
    if (state.ballSaveTime > 0) {
      setBallReady();
      state.mode = MODE.LAUNCHING;
      state.launchTimer = 0.75;
      state.launchExitDone = false;
      state.ball.vx = -world.width * 0.38;
      state.ball.vy = -world.height * 1.45;
      state.ballSaveTime = Math.max(0, state.ballSaveTime - 2);
      updateHud();
      return;
    }
    state.ballsLeft -= 1;
    state.lastOrbit.left = false;
    state.lastOrbit.right = false;
    state.lastOrbit.center = false;
    if (state.ballsLeft <= 0) {
      endGame();
      return;
    }
    setReadyToLaunch();
  }

  function update(dt) {
    background.update(
      dt,
      {
        flowIntensity: clamp(state.score / 1500, 0, 1),
        speed: 130 + hypot(state.ball.vx, state.ball.vy) * 0.08,
        environmentProgress: state.environmentProgress,
      },
      world
    );
    effects.update(dt, {
      runner: { x: state.ball.x - state.ball.r, y: state.ball.y - state.ball.r, width: state.ball.r * 2, height: state.ball.r * 2 },
      flowIntensity: clamp(state.score / 1500, 0, 1),
    });
    state.bumpPulse = Math.max(0, state.bumpPulse - dt);
    state.flipperCooldown = Math.max(0, state.flipperCooldown - dt);
    state.ballSaveTime = Math.max(0, state.ballSaveTime - dt);
    audio.setIntensity(state.muted ? 0 : clamp(0.2 + state.environmentProgress * 0.5, 0, 1));

    if (!isActiveMode()) return;
    updateFlippers(dt);

    if (isReady()) {
      state.ball.x = launchLane.x;
      state.ball.y = world.height * 0.82;
      return;
    }

    const substeps = 4;
    const stepDt = dt / substeps;
    for (let i = 0; i < substeps; i += 1) {
      guideLaunchExit(stepDt);
      state.ball.vy += world.height * 0.84 * stepDt;
      state.ball.vx *= 0.999;
      state.ball.vy *= 0.999;
      state.ball.x += state.ball.vx * stepDt;
      state.ball.y += state.ball.vy * stepDt;

      applyPlayfieldBounds();
      state.walls.forEach((wall) => {
        const boost = wall.kind === "sling" ? world.width * 0.09 : 0;
        collideSegment(wall, wall.width * 0.52, boost);
      });
      [state.flippers.left, state.flippers.right].forEach((flipper) => {
        const boost = flipper.pressed ? Math.abs(flipper.angularVelocity) * world.width * 0.055 : 0;
        if (collideSegment(flipper.segment, flipper.width * 0.55, boost) && flipper.pressed) {
          state.ball.vy -= world.height * 0.28;
          state.ball.vx += flipper.side === "left" ? world.width * 0.14 : -world.width * 0.14;
        }
        applyFlipperSkillShot(flipper);
      });
      state.bumpers.forEach((bumper) => {
        if (collideCircle(bumper, world.width * 0.1)) awardScore(15, bumper.x, bumper.y, "spring");
      });
      state.posts.forEach((post) => collideCircle(post, post.kick));
      scoreLanes();

      const maxSpeed = world.height * 1.8;
      const speed = hypot(state.ball.vx, state.ball.vy);
      if (speed > maxSpeed) {
        state.ball.vx = (state.ball.vx / speed) * maxSpeed;
        state.ball.vy = (state.ball.vy / speed) * maxSpeed;
      }
      if (state.ball.y - state.ball.r > world.height + 28) {
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
      waitingLaunch: isReady(),
      modeLabel:
        state.mode === MODE.READY
          ? "Space o Launch para sacar la bola"
          : state.mode === MODE.LAUNCHING || state.mode === MODE.PLAYING
            ? "Droppy Pinball en juego"
            : state.mode === MODE.PAUSED
              ? "Pausa"
              : state.mode === MODE.GAME_OVER
                ? "Fin de partida"
                : "Better Mood Arcade",
      controlsLabel: "A/D · Flechas · Space",
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
      waitingLaunch: isReady(),
      canLaunch: isReady(),
      score: state.score,
      highScore: state.highScore,
      ballsLeft: state.ballsLeft,
      ball: {
        x: Number(state.ball.x.toFixed(1)),
        y: Number(state.ball.y.toFixed(1)),
        vx: Number(state.ball.vx.toFixed(1)),
        vy: Number(state.ball.vy.toFixed(1)),
        r: Number(state.ball.r.toFixed(1)),
      },
      flippers: {
        left: Number(state.flippers.left.angle.toFixed(2)),
        right: Number(state.flippers.right.angle.toFixed(2)),
      },
      input: { ...state.input },
    });
  }

  function pressControl(side, pressed) {
    if (!isActiveMode()) return;
    if (side === "left") state.input.left = pressed;
    if (side === "right") state.input.right = pressed;
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
    if (state.muted) audio.suspend();
    else if (isActiveMode()) audio.resume();
    updateHud();
  }

  document.addEventListener("keydown", (event) => {
    if (!isActive) return;
    if (CAPTURED_KEYS.has(event.code)) event.preventDefault();
    if (event.repeat && event.code !== "Space") return;

    if (state.mode === MODE.IDLE && event.code === "Enter") {
      startGame();
      return;
    }
    if (event.code === "KeyP") {
      if (isActiveMode()) pauseGame();
      else if (state.mode === MODE.PAUSED) resumeGame();
      return;
    }
    if (event.code === "KeyM") {
      toggleMute();
      return;
    }
    if (event.code === "KeyF") {
      toggleFullscreen();
      return;
    }
    if (event.code === "ArrowLeft" || event.code === "KeyA") pressControl("left", true);
    if (event.code === "ArrowRight" || event.code === "KeyD") pressControl("right", true);
    if (event.code === "Space" || event.code === "ArrowUp") launchBall();
  });

  document.addEventListener("keyup", (event) => {
    if (!isActive) return;
    if (CAPTURED_KEYS.has(event.code)) event.preventDefault();
    if (event.code === "ArrowLeft" || event.code === "KeyA") pressControl("left", false);
    if (event.code === "ArrowRight" || event.code === "KeyD") pressControl("right", false);
  });

  controlButtons.forEach((button) => {
    const action = button.dataset.pinballAction;
    if (!action) return;
    if (action === "launch") {
      const fireLaunch = (event) => {
        event.preventDefault();
        capturePointer(button, event.pointerId);
        handleAction("launch");
      };
      button.addEventListener("pointerdown", fireLaunch);
      button.addEventListener("click", fireLaunch);
      return;
    }
    const release = (event) => {
      event?.preventDefault?.();
      pressControl(action, false);
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      audio.ensureStarted();
      if (!state.muted) audio.resume();
      capturePointer(button, event.pointerId);
      pressControl(action, true);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!isActive) return;
    event.preventDefault();
    focusGame();
    audio.ensureStarted();
    if (!state.muted) audio.resume();
    if (state.mode === MODE.IDLE) {
      startGame();
      return;
    }
    if (state.mode === MODE.PAUSED) {
      resumeGame();
      return;
    }
    if (isReady()) {
      launchBall();
      return;
    }
    if (!isLive()) return;
    const rect = canvas.getBoundingClientRect();
    const side = event.clientX - rect.left < rect.width / 2 ? "left" : "right";
    pointerSides.set(event.pointerId, side);
    capturePointer(canvas, event.pointerId);
    pressControl(side, true);
  });

  function releaseCanvasPointer(event) {
    const side = pointerSides.get(event.pointerId);
    if (!side) return;
    event.preventDefault();
    pointerSides.delete(event.pointerId);
    pressControl(side, false);
  }

  canvas.addEventListener("pointerup", releaseCanvasPointer);
  canvas.addEventListener("pointercancel", releaseCanvasPointer);
  canvas.addEventListener("pointerleave", releaseCanvasPointer);

  startBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    startGame();
  });
  resumeBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    resumeGame();
  });
  restartButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      startGame();
    });
  });
  pauseBtn?.addEventListener("click", () => {
    if (isActiveMode()) pauseGame();
    else if (state.mode === MODE.PAUSED) resumeGame();
  });
  muteBtn?.addEventListener("click", toggleMute);
  fullscreenBtn?.addEventListener("click", toggleFullscreen);

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    releaseControls();
    if (document.hidden) audio.suspend();
    else if (isActiveMode() && !state.muted) audio.resume();
  });

  const controller = {
    gameKey: root.dataset.gameKey || "pinball",
    renderGameToText,
    advanceTime: (ms) => advanceSimulation(ms),
    setActive(next) {
      isActive = Boolean(next);
      if (!isActive && isActiveMode()) pauseGame();
      if (isActive) {
        requestAnimationFrame(resizeCanvas);
        window.render_game_to_text = renderGameToText;
        window.advanceTime = (ms) => advanceSimulation(ms);
      }
    },
  };

  root.__arcadeStage = controller;
  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => advanceSimulation(ms);

  resizeCanvas();
  setOverlay("start");
  updateHud();
})();
