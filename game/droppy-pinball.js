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
  const comboEl = root.querySelector("[data-pinball-combo]");
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
  const launchControl = root.querySelector('[data-pinball-action="launch"]');

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
    nudgeCooldown: 0,
    slingCooldown: 0,
    bumpPulse: 0,
    combo: 1,
    comboTimer: 0,
    bumperCooldowns: [0, 0, 0],
    bumperContacts: [false, false, false],
    missionCompleted: 0,
    targetResetTimer: 0,
    popups: [],
    trail: [],
    shake: 0,
    visualTime: 0,
    lastHit: "",
    stallTimer: 0,
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
  let keyboardEngaged = false;
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
    keyboardEngaged = true;
    if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });
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

  async function toggleFullscreen() {
    if (document.fullscreenElement === root) {
      await document.exitFullscreen?.();
      return;
    }
    if (root.requestFullscreen) {
      try {
        await root.requestFullscreen();
        return;
      } catch {
        // Fallback below keeps the game usable when fullscreen permission is denied.
      }
    }
    setFullscreenMode(!root.classList.contains("arcade-play--fullscreen"));
  }

  function ignoreKeyboardEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    const interactive = target.closest('input, textarea, select, button, a, summary, [contenteditable="true"]');
    return Boolean(interactive && !root.contains(interactive));
  }

  function hasGameFocus() {
    return keyboardEngaged && isActive;
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
      x: world.width * (isLeft ? 0.3 : 0.7),
      y: world.height * 0.865,
    };
    return {
      side,
      pivot,
      length: world.width * 0.145,
      width: world.width * 0.036,
      restAngle: isLeft ? 0.16 : Math.PI - 0.16,
      activeAngle: isLeft ? -0.64 : Math.PI + 0.64,
      angle: isLeft ? 0.16 : Math.PI - 0.16,
      previousAngle: isLeft ? 0.16 : Math.PI - 0.16,
      angularVelocity: 0,
      pressed: false,
      fill: "#ffde00",
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
    bounds.left = world.width * 0.055;
    bounds.right = world.width * 0.945;
    bounds.top = world.height * 0.145;
    bounds.bottom = world.height * 0.965;
    bounds.drainLeft = world.width * 0.405;
    bounds.drainRight = world.width * 0.595;

    launchLane.x = world.width * 0.885;
    launchLane.top = world.height * 0.17;
    launchLane.bottom = world.height * 0.89;
    launchLane.exitY = world.height * 0.17;

    state.ball.r = clamp(world.width * 0.022, 10, 15);
    state.bumpers = [
      { x: world.width * 0.31, y: world.height * 0.29, r: world.width * 0.066, fill: "#ffde00", glow: "rgba(255, 222, 0, 0.54)", label: "F", name: "Focus", pulse: 0 },
      { x: world.width * 0.61, y: world.height * 0.27, r: world.width * 0.064, fill: "#ffba00", glow: "rgba(255, 186, 0, 0.5)", label: "C", name: "Chill", pulse: 0 },
      { x: world.width * 0.48, y: world.height * 0.45, r: world.width * 0.07, fill: "#fff6ce", glow: "rgba(255, 222, 0, 0.44)", label: "M", name: "Mood", pulse: 0 },
    ];
    state.posts = [
      { x: world.width * 0.19, y: world.height * 0.69, r: world.width * 0.02, kick: world.width * 0.04 },
      { x: world.width * 0.33, y: world.height * 0.76, r: world.width * 0.024, kick: world.width * 0.052 },
      { x: world.width * 0.67, y: world.height * 0.76, r: world.width * 0.024, kick: world.width * 0.052 },
      { x: world.width * 0.79, y: world.height * 0.69, r: world.width * 0.02, kick: world.width * 0.04 },
    ];
    state.targets = [
      ..."FOCUS".split("").map((label, index) => ({
        x: world.width * (0.235 + index * 0.115),
        y: world.height * (index === 2 ? 0.185 : 0.205),
        width: world.width * 0.075,
        height: world.height * 0.032,
        label,
        active: true,
        pulse: 0,
      })),
    ];
    state.walls = [
      makeSegment(0.13, 0.22, 0.075, 0.68, 0.015, "#231f20"),
      makeSegment(0.13, 0.22, 0.28, 0.15, 0.015, "#231f20"),
      makeSegment(0.28, 0.15, 0.66, 0.15, 0.015, "#231f20"),
      makeSegment(0.66, 0.15, 0.75, 0.2, 0.015, "#231f20"),
      makeSegment(0.95, 0.18, 0.95, 0.7, 0.015, "#231f20"),
      makeSegment(0.78, 0.28, 0.78, 0.82, 0.012, "rgba(35,31,32,.72)", "lane"),
      makeSegment(0.075, 0.68, 0.15, 0.86, 0.016, "#231f20"),
      makeSegment(0.95, 0.7, 0.94, 0.92, 0.016, "#231f20"),
      makeSegment(0.16, 0.64, 0.3, 0.78, 0.018, "#ffba00", "sling"),
      makeSegment(0.7, 0.78, 0.82, 0.64, 0.018, "#ffba00", "sling"),
      makeSegment(0.14, 0.56, 0.27, 0.48, 0.012, "rgba(35,31,32,.64)", "guide"),
      makeSegment(0.69, 0.5, 0.78, 0.58, 0.012, "rgba(35,31,32,.64)", "guide"),
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
    state.nudgeCooldown = 0;
    releaseControls();
  }

  function setReadyToLaunch(shouldStartLoop = true) {
    setBallReady();
    state.mode = MODE.READY;
    state.running = true;
    updateHud();
    if (shouldStartLoop) startLoop();
  }

  function resetGameState() {
    state.score = 0;
    state.ballsLeft = 3;
    state.bumpPulse = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.bumperCooldowns = [0, 0, 0];
    state.bumperContacts = [false, false, false];
    state.missionCompleted = 0;
    state.targetResetTimer = 0;
    state.popups = [];
    state.trail = [];
    state.shake = 0;
    state.visualTime = 0;
    state.lastHit = "";
    state.stallTimer = 0;
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
    const preserveLiveBall = old.width > 40 && old.height > 40 && (isLive() || state.mode === MODE.PAUSED);
    const targetStates = state.targets.map((target) => target.active);
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
    targetStates.forEach((active, index) => {
      if (state.targets[index]) state.targets[index].active = active;
    });

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

  function awardScore(points, x, y, kind = "bean", label = "") {
    state.score += points;
    state.highScore = Math.max(state.highScore, state.score);
    state.bumpPulse = 0.18;
    state.shake = Math.max(state.shake, points >= 100 ? 8 : 3.5);
    state.lastHit = label || `+${points}`;
    state.popups.push({
      x,
      y,
      text: label ? `${label} +${points}` : `+${points}`,
      ttl: 0.62,
      maxTtl: 0.62,
    });
    if (state.popups.length > 3) state.popups.shift();
    state.environmentProgress = clamp(state.score / 1400, 0, 1);
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
    state.launchTimer = 1.35;
    state.launchExitDone = false;
    state.ballSaveTime = 7;
    state.ball.vx = -world.width * 0.02;
    state.ball.vy = -world.height * 1.72;
    if (hypot(state.ball.vx, state.ball.vy) < world.height * 0.9) {
      state.ball.vx = -world.width * 0.03;
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
    if (comboEl) comboEl.textContent = `×${state.combo}`;
    if (stateEl) {
      stateEl.textContent =
        state.mode === MODE.READY
          ? "Lanzar"
          : state.mode === MODE.LAUNCHING || state.mode === MODE.PLAYING
            ? "En juego"
            : state.mode === MODE.PAUSED
              ? "Pausa"
              : state.mode === MODE.GAME_OVER
                ? "Fin"
                : "Listo";
    }
    if (pauseBtn) pauseBtn.disabled = state.mode === MODE.IDLE || state.mode === MODE.GAME_OVER;
    if (pauseBtn) {
      const paused = state.mode === MODE.PAUSED;
      pauseBtn.textContent = paused ? "▶" : "II";
      pauseBtn.setAttribute("aria-label", paused ? "Reanudar juego" : "Pausar juego");
    }
    if (muteBtn) {
      muteBtn.textContent = state.muted ? "×" : "♪";
      muteBtn.setAttribute("aria-label", state.muted ? "Activar sonido" : "Silenciar juego");
    }
    if (launchControl) {
      const nudges = isLive();
      launchControl.textContent = nudges ? "Impulso" : "Lanzar";
      launchControl.setAttribute("aria-label", nudges ? "Dar un impulso suave a la mesa" : "Lanzar la bola");
    }
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
    // One clear action must start a real game. Requiring a second tap made Safari/mobile
    // look frozen even though the table was only waiting in the shooter lane.
    launchBall();
  }

  function endGame() {
    state.mode = MODE.GAME_OVER;
    state.running = false;
    releaseControls();
    cancelAnimationFrame(rafId);
    saveHighScore();
    setOverlay("gameover");
    if (document.fullscreenElement === root) document.exitFullscreen?.().catch(() => {});
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

  function collideFlipper(flipper) {
    const segment = flipper.segment;
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
    const minDist = state.ball.r + flipper.width * 0.56;
    if (dist >= minDist) return false;

    const nx = dx / dist;
    const ny = dy / dist;
    state.ball.x += nx * (minDist - dist + 0.2);
    state.ball.y += ny * (minDist - dist + 0.2);

    const rx = cx - flipper.pivot.x;
    const ry = cy - flipper.pivot.y;
    const surfaceVx = -flipper.angularVelocity * ry;
    const surfaceVy = flipper.angularVelocity * rx;
    const relativeVx = state.ball.vx - surfaceVx;
    const relativeVy = state.ball.vy - surfaceVy;
    const approach = relativeVx * nx + relativeVy * ny;
    if (approach < 0) {
      const bounce = 0.84;
      state.ball.vx = relativeVx - (1 + bounce) * approach * nx + surfaceVx;
      state.ball.vy = relativeVy - (1 + bounce) * approach * ny + surfaceVy;
    }

    if (flipper.pressed && Math.abs(flipper.angularVelocity) > 1.2) {
      if (state.flipperCooldown <= 0) {
        state.flipperCooldown = 0.09;
        state.bumpPulse = Math.max(state.bumpPulse, 0.06);
        if (navigator.vibrate) navigator.vibrate(7);
      }
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

  function nudgeTable() {
    if (!isLive() || state.nudgeCooldown > 0) return false;
    const direction = state.ball.x < world.width * 0.5 ? 1 : -1;
    state.ball.vx += direction * world.width * 0.13;
    state.ball.vy -= world.height * 0.12;
    state.nudgeCooldown = 0.7;
    state.bumpPulse = Math.max(state.bumpPulse, 0.08);
    if (navigator.vibrate) navigator.vibrate(6);
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

  function applyShooterGate() {
    if (state.mode !== MODE.PLAYING) return;
    const gateX = world.width * 0.78;
    if (state.ball.x + state.ball.r > gateX && state.ball.y < world.height * 0.29) {
      state.ball.x = gateX - state.ball.r;
      state.ball.vx = -Math.max(Math.abs(state.ball.vx) * 0.82, world.width * 0.16);
    }
  }

  function guideLaunchExit(dt) {
    if (state.mode !== MODE.LAUNCHING) return;
    state.launchTimer = Math.max(0, state.launchTimer - dt);

    // Curve the real trajectory out of the shooter lane. Position is never teleported.
    if (!state.launchExitDone && state.ball.y <= launchLane.exitY + world.height * 0.05) {
      state.launchExitDone = true;
      state.ball.vx = -world.width * 1.42;
      state.ball.vy = world.height * 0.06;
    }
    if (state.ball.x < world.width * 0.785) {
      state.mode = MODE.PLAYING;
      awardScore(10, state.ball.x, state.ball.y, "spring", "LANZAMIENTO");
      return;
    }
    // Safety only adds velocity if a browser throttles the first frames; it never jumps the ball.
    if (state.launchTimer <= 0) {
      state.ball.vx = Math.min(state.ball.vx, -world.width * 0.72);
      state.ball.vy = Math.min(state.ball.vy, world.height * 0.08);
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
      awardScore(50, state.ball.x, state.ball.y, "spring", "ÓRBITA");
    }
    state.lastOrbit.center = centerLane;

    state.targets.forEach((target) => {
      if (!target.active) return;
      const withinX = Math.abs(state.ball.x - target.x) <= target.width * 0.62;
      const withinY = Math.abs(state.ball.y - target.y) <= target.height;
      if (withinX && withinY) {
        target.active = false;
        target.pulse = 0.3;
        state.ball.vy = Math.abs(state.ball.vy) + world.height * 0.25;
        awardScore(25, target.x, target.y, "bean", target.label);
      }
    });

    if (state.targetResetTimer <= 0 && state.targets.length > 0 && state.targets.every((target) => !target.active)) {
      state.missionCompleted += 1;
      state.targetResetTimer = 1.1;
      state.combo = Math.min(5, state.combo + 1);
      state.comboTimer = 2.5;
      awardScore(500, world.width * 0.5, world.height * 0.19, "adaptogen", "FOCUS");
    }
  }

  function loseBall() {
    if (state.ballSaveTime > 0) {
      const remainingSave = state.ballSaveTime;
      setBallReady();
      state.mode = MODE.LAUNCHING;
      state.launchTimer = 0.75;
      state.launchExitDone = false;
      state.ball.vx = -world.width * 0.02;
      state.ball.vy = -world.height * 1.72;
      state.ballSaveTime = Math.max(0, remainingSave - 2);
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
    setReadyToLaunch(false);
  }

  function update(dt) {
    if (!isActiveMode()) return;
    state.visualTime += dt;
    background.update(
      dt,
      {
        flowIntensity: clamp(state.score / 1500, 0, 1),
        speed: 130 + hypot(state.ball.vx, state.ball.vy) * 0.08,
        environmentProgress: state.environmentProgress,
      },
      world
    );
    state.bumpPulse = Math.max(0, state.bumpPulse - dt);
    state.flipperCooldown = Math.max(0, state.flipperCooldown - dt);
    state.nudgeCooldown = Math.max(0, state.nudgeCooldown - dt);
    state.slingCooldown = Math.max(0, state.slingCooldown - dt);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    state.targetResetTimer = Math.max(0, state.targetResetTimer - dt);
    state.bumperCooldowns = state.bumperCooldowns.map((value) => Math.max(0, value - dt));
    state.bumpers.forEach((bumper) => { bumper.pulse = Math.max(0, (bumper.pulse || 0) - dt); });
    state.targets.forEach((target) => { target.pulse = Math.max(0, (target.pulse || 0) - dt); });
    state.popups.forEach((popup) => { popup.ttl -= dt; popup.y -= world.height * 0.045 * dt; });
    state.popups = state.popups.filter((popup) => popup.ttl > 0);
    state.shake = Math.max(0, state.shake - dt * 18);
    if (state.targetResetTimer === 0 && state.targets.length && state.targets.every((target) => !target.active)) {
      state.targets.forEach((target) => { target.active = true; });
    }
    if (state.comboTimer === 0) state.combo = 1;
    state.ballSaveTime = Math.max(0, state.ballSaveTime - dt);
    audio.setIntensity(state.muted ? 0 : clamp(0.2 + state.environmentProgress * 0.5, 0, 1));

    updateFlippers(dt);

    if (isReady()) {
      state.ball.x = launchLane.x;
      state.ball.y = world.height * 0.82;
      return;
    }

    const substeps = 8;
    const stepDt = dt / substeps;
    for (let i = 0; i < substeps; i += 1) {
      guideLaunchExit(stepDt);
      state.ball.vy += world.height * 0.84 * stepDt;
      state.ball.vx *= 0.999;
      state.ball.vy *= 0.999;
      state.ball.x += state.ball.vx * stepDt;
      state.ball.y += state.ball.vy * stepDt;

      applyPlayfieldBounds();
      applyShooterGate();
      state.walls.forEach((wall) => {
        const boost = wall.kind === "sling" ? world.width * 0.09 : 0;
        const collided = collideSegment(wall, wall.width * 0.52, boost);
        if (collided && wall.kind === "sling" && state.slingCooldown <= 0) {
          state.slingCooldown = 0.12;
          awardScore(20, state.ball.x, state.ball.y, "spring", "SLING");
        }
      });
      [state.flippers.left, state.flippers.right].forEach((flipper) => {
        collideFlipper(flipper);
      });
      state.bumpers.forEach((bumper, index) => {
        const wasTouching = state.bumperContacts[index];
        const touching = collideCircle(bumper, wasTouching ? 0 : world.width * 0.12);
        state.bumperContacts[index] = touching;
        if (!touching || wasTouching || state.bumperCooldowns[index] > 0) return;
        state.combo = state.comboTimer > 0 ? Math.min(5, state.combo + 1) : 1;
        state.comboTimer = 1.8;
        state.bumperCooldowns[index] = 0.18;
        bumper.pulse = 0.34;
        awardScore(20 * state.combo, bumper.x, bumper.y, "spring", bumper.name.toUpperCase());
        if (navigator.vibrate) navigator.vibrate(7);
      });
      state.posts.forEach((post) => collideCircle(post, post.kick));
      if (state.mode === MODE.PLAYING) scoreLanes();

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
    state.trail.push({ x: state.ball.x, y: state.ball.y });
    if (state.trail.length > 9) state.trail.shift();
    const liveSpeed = hypot(state.ball.vx, state.ball.vy);
    if (state.mode === MODE.PLAYING && liveSpeed < world.height * 0.085) state.stallTimer += dt;
    else state.stallTimer = 0;
    if (state.stallTimer > 1.05) {
      const towardCenter = state.ball.x < world.width * 0.5 ? 1 : -1;
      state.ball.vx = towardCenter * world.width * 0.34;
      state.ball.vy = -world.height * 0.52;
      state.stallTimer = 0;
      state.lastHit = "BOLA LIBRE";
      state.popups.push({ x: state.ball.x, y: state.ball.y, text: "BOLA LIBRE", ttl: 0.62, maxTtl: 0.62 });
      if (state.popups.length > 3) state.popups.shift();
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
          ? "Espacio o Lanzar para sacar la bola"
          : state.mode === MODE.LAUNCHING || state.mode === MODE.PLAYING
            ? "Droppy Pinball en juego"
            : state.mode === MODE.PAUSED
              ? "Pausa"
              : state.mode === MODE.GAME_OVER
                ? "Fin de partida"
                : "Better Mood Arcade",
      controlsLabel: "A/D · Flechas · Espacio",
      environmentProgress: state.environmentProgress,
      combo: state.combo,
      comboTimer: state.comboTimer,
      ballSaveTime: state.ballSaveTime,
      missionCompleted: state.missionCompleted,
      missionProgress: state.targets.filter((target) => !target.active).length,
      popups: state.popups,
      trail: state.trail,
      shake: state.shake,
      visualTime: state.visualTime,
      lastHit: state.lastHit,
      stallTime: Number(state.stallTimer.toFixed(2)),
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
    const wasRunning = state.running;
    if (wasRunning) cancelAnimationFrame(rafId);
    const step = 1000 / 60;
    const steps = Math.max(1, Math.round(Math.max(step, ms) / step));
    for (let index = 0; index < steps; index += 1) {
      update(step / 1000);
    }
    draw();
    if (wasRunning) startLoop();
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
      combo: state.combo,
      comboTime: Number(state.comboTimer.toFixed(2)),
      ballSaveTime: Number(state.ballSaveTime.toFixed(2)),
      mission: {
        name: "FOCUS",
        lit: state.targets.filter((target) => !target.active).map((target) => target.label).join(""),
        progress: state.targets.filter((target) => !target.active).length,
        completed: state.missionCompleted,
      },
      targets: state.targets.map((target) => ({ label: target.label, lit: !target.active })),
      lastHit: state.lastHit,
      nudgeReady: state.nudgeCooldown <= 0,
      muted: state.muted,
      fullscreen: document.fullscreenElement === root || root.classList.contains("arcade-play--fullscreen"),
      engaged: keyboardEngaged,
      coordinateSystem: "origin top-left; x right; y down; canvas CSS pixels",
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
      if (state.mode === MODE.IDLE) startGame();
      else if (!launchBall()) nudgeTable();
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
    if (ignoreKeyboardEvent(event)) return;
    if (!hasGameFocus()) return;
    if (event.code === "Escape" && root.classList.contains("arcade-play--fullscreen") && !document.fullscreenElement) {
      setFullscreenMode(false);
      return;
    }
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
    if (event.code === "Space" || event.code === "ArrowUp") {
      if (!launchBall()) nudgeTable();
    }
  });

  document.addEventListener("keyup", (event) => {
    if (!isActive) return;
    if (ignoreKeyboardEvent(event)) return;
    if (!hasGameFocus()) return;
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

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === root) setFullscreenMode(true);
    else if (root.classList.contains("arcade-play--fullscreen")) setFullscreenMode(false);
  });

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("pointerdown", (event) => {
    keyboardEngaged = root.contains(event.target);
  }, true);
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
