(() => {
  const root = document.querySelector("[data-arcade-game]");
  if (!root) return;

  const canvas = root.querySelector("#arcade-canvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  if (
    !window.DROPPY_ARCADE_PIECES ||
    typeof window.createDroppyBackgroundSystem !== "function" ||
    typeof window.createDroppyEffectsSystem !== "function" ||
    typeof window.createDroppyAudioSystem !== "function" ||
    typeof window.createDroppyArcadeRenderer !== "function"
  ) {
    console.warn("[arcade] Missing module bootstrap.");
    return;
  }

  const {
    COLS,
    ROWS,
    THEMES,
    rotateMatrix,
    matrixToCells,
    createBag,
  } = window.DROPPY_ARCADE_PIECES;

  const scoreEl = root.querySelector("[data-arcade-score]");
  const linesEl = root.querySelector("[data-arcade-lines]");
  const levelEl = root.querySelector("[data-arcade-level]");
  const flowEl = root.querySelector("[data-arcade-flow]");
  const overlayStart = root.querySelector('[data-arcade-overlay="start"]');
  const overlayPause = root.querySelector('[data-arcade-overlay="pause"]');
  const overlayGameover = root.querySelector('[data-arcade-overlay="gameover"]');
  const startBtn = root.querySelector("[data-arcade-start]");
  const restartButtons = Array.from(root.querySelectorAll("[data-arcade-restart]"));
  const resumeBtn = root.querySelector("[data-arcade-resume]");
  const pauseBtn = root.querySelector("[data-arcade-pause]");
  const fullscreenBtn = root.querySelector("[data-arcade-fullscreen]");
  const finalScoreEl = root.querySelector("[data-arcade-final-score]");
  const finalLinesEl = root.querySelector("[data-arcade-final-lines]");
  const controlButtons = Array.from(root.querySelectorAll("[data-arcade-action]"));

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

  let random = mulberry32(Date.now());
  let nextPieceFromBag = createBag(random);

  const world = {
    width: 0,
    height: 0,
    groundY: 0,
  };

  const background = window.createDroppyBackgroundSystem({ random: () => random() });
  const effects = window.createDroppyEffectsSystem({ random: () => random() });
  const audio = window.createDroppyAudioSystem();

  const droppyImage = new Image();
  droppyImage.src = "../assets/droppy.PNG";

  const renderer = window.createDroppyArcadeRenderer({
    ctx,
    canvas,
    background,
    effects,
    droppyImage,
  });

  const model = {
    board: createBoard(),
    current: null,
    next: null,
    score: 0,
    lines: 0,
    level: 1,
    combo: 0,
    flow: 0,
    dropAccumulator: 0,
    lockTimer: 0,
    flashRows: [],
    flashTimer: 0,
    softDrop: false,
  };

  let state = "idle";
  let running = false;
  let rafId = 0;
  let lastRealNow = 0;
  let isActive = !root.closest("[hidden]");

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) {
      world.width = 360;
      world.height = 520;
      world.groundY = world.height * 0.9;
      background.resize(world);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    world.width = rect.width;
    world.height = rect.height;
    world.groundY = rect.height * 0.9;
    background.resize(world);
    draw();
  }

  function setOverlay(which) {
    if (overlayStart) overlayStart.hidden = which !== "start";
    if (overlayPause) overlayPause.hidden = which !== "pause";
    if (overlayGameover) overlayGameover.hidden = which !== "gameover";
  }

  function setFullscreenMode(enabled) {
    root.classList.toggle("arcade-play--fullscreen", enabled);
    document.body.classList.toggle("droppy-lock", enabled);
    requestAnimationFrame(() => resizeCanvas());
  }

  function toggleFullscreen() {
    setFullscreenMode(!root.classList.contains("arcade-play--fullscreen"));
  }

  function createPieceState(piece) {
    return {
      key: piece.key,
      theme: THEMES[piece.key],
      matrix: piece.matrix.map((row) => row.slice()),
      x: Math.floor(COLS / 2) - Math.ceil(piece.matrix[0].length / 2),
      y: -1,
    };
  }

  function getPieceCells(piece, customY = piece?.y, customX = piece?.x, customMatrix = piece?.matrix) {
    if (!piece || !customMatrix) return [];
    return matrixToCells(customMatrix, customX, customY);
  }

  function collides(x, y, matrix) {
    const cells = matrixToCells(matrix, x, y);
    for (const cell of cells) {
      if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) {
        return true;
      }
      if (cell.y >= 0 && model.board[cell.y][cell.x]) {
        return true;
      }
    }
    return false;
  }

  function getDropInterval() {
    return Math.max(0.76 - (model.level - 1) * 0.055, 0.12);
  }

  function spawnPiece() {
    if (!model.next) {
      model.next = nextPieceFromBag();
    }
    model.current = createPieceState(model.next);
    model.next = nextPieceFromBag();
    model.dropAccumulator = 0;
    model.lockTimer = 0;
    if (collides(model.current.x, model.current.y, model.current.matrix)) {
      endGame();
    }
  }

  function resetModel() {
    random = mulberry32(Date.now());
    nextPieceFromBag = createBag(random);
    model.board = createBoard();
    model.current = null;
    model.next = nextPieceFromBag();
    model.score = 0;
    model.lines = 0;
    model.level = 1;
    model.combo = 0;
    model.flow = 0;
    model.dropAccumulator = 0;
    model.lockTimer = 0;
    model.flashRows = [];
    model.flashTimer = 0;
    model.softDrop = false;
    effects.reset();
    background.reset(world);
    spawnPiece();
    updateHud();
  }

  function getLayout() {
    return renderer.computeLayout(world);
  }

  function getPieceBounds(piece) {
    const layout = getLayout();
    const cells = getPieceCells(piece);
    if (!cells.length) return null;
    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    return {
      x: layout.boardX + minX * layout.cell,
      y: layout.boardY + minY * layout.cell,
      width: (maxX - minX + 1) * layout.cell,
      height: (maxY - minY + 1) * layout.cell,
    };
  }

  function applyScore(clearCount) {
    const base = [0, 120, 320, 560, 900][clearCount] || 0;
    if (clearCount > 0) {
      model.combo += 1;
      model.lines += clearCount;
      model.level = 1 + Math.floor(model.lines / 8);
      model.flow = clamp(model.flow + 0.18 + clearCount * 0.08 + model.combo * 0.02, 0, 1);
      const comboBonus = Math.max(0, model.combo - 1) * 55;
      model.score += (base + comboBonus) * model.level;
    } else {
      model.combo = 0;
      model.flow = Math.max(0, model.flow - 0.08);
    }
  }

  function clearLines() {
    const cleared = [];
    for (let y = ROWS - 1; y >= 0; y -= 1) {
      if (model.board[y].every(Boolean)) {
        cleared.push(y);
        model.board.splice(y, 1);
        model.board.unshift(Array(COLS).fill(null));
        y += 1;
      }
    }

    applyScore(cleared.length);
    if (!cleared.length) return;

    model.flashRows = cleared.slice();
    model.flashTimer = 0.18;

    const layout = getLayout();
    const burstKind = cleared.length >= 4 ? "spring" : cleared.length >= 2 ? "adaptogen" : "bean";
    cleared.forEach((row) => {
      effects.spawnCollectBurst(
        layout.boardX + layout.boardW * 0.5,
        layout.boardY + row * layout.cell + layout.cell * 0.5,
        burstKind,
        Math.max(1, model.combo),
        model.flow
      );
    });
  }

  function lockCurrentPiece() {
    if (!model.current) return;
    const cells = getPieceCells(model.current);
    cells.forEach((cell) => {
      if (cell.y < 0) return;
      model.board[cell.y][cell.x] = {
        key: model.current.key,
        theme: model.current.theme,
      };
    });
    model.score += 12 * model.level;
    const bounds = getPieceBounds(model.current);
    if (bounds) {
      effects.spawnLandingDust(bounds.x + bounds.width * 0.5, bounds.y + bounds.height, 1.4);
    }
    clearLines();
    spawnPiece();
    updateHud();
  }

  function movePiece(dx) {
    if (state !== "playing" || !model.current) return false;
    const nextX = model.current.x + dx;
    if (collides(nextX, model.current.y, model.current.matrix)) return false;
    model.current.x = nextX;
    model.lockTimer = 0;
    draw();
    return true;
  }

  function rotatePiece() {
    if (state !== "playing" || !model.current) return false;
    const rotated = rotateMatrix(model.current.matrix);
    for (const offset of [0, -1, 1, -2, 2]) {
      if (collides(model.current.x + offset, model.current.y, rotated)) continue;
      model.current.x += offset;
      model.current.matrix = rotated;
      model.lockTimer = 0;
      draw();
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (state !== "playing" || !model.current) return;
    let moved = 0;
    while (!collides(model.current.x, model.current.y + 1, model.current.matrix)) {
      model.current.y += 1;
      moved += 1;
    }
    model.score += moved * 2;
    lockCurrentPiece();
    draw();
  }

  function startGame() {
    if (!isActive) return;
    audio.ensureStarted();
    audio.resume();
    resetModel();
    state = "playing";
    running = true;
    if (pauseBtn) pauseBtn.textContent = "II";
    setOverlay(null);
    draw();
    startLoop();
  }

  function endGame() {
    state = "gameover";
    running = false;
    cancelAnimationFrame(rafId);
    audio.suspend();
    setOverlay("gameover");
    setFullscreenMode(false);
    if (pauseBtn) {
      pauseBtn.disabled = true;
      pauseBtn.textContent = "II";
    }
    if (finalScoreEl) finalScoreEl.textContent = String(model.score);
    if (finalLinesEl) finalLinesEl.textContent = String(model.lines);
    draw();
  }

  function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    running = false;
    cancelAnimationFrame(rafId);
    audio.suspend();
    if (pauseBtn) pauseBtn.textContent = ">";
    setOverlay("pause");
    draw();
  }

  function resumeGame() {
    if (!isActive) return;
    if (state !== "paused") return;
    state = "playing";
    running = true;
    audio.resume();
    if (pauseBtn) pauseBtn.textContent = "II";
    setOverlay(null);
    startLoop();
  }

  function startLoop() {
    cancelAnimationFrame(rafId);
    lastRealNow = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(model.score);
    if (linesEl) linesEl.textContent = String(model.lines);
    if (levelEl) levelEl.textContent = String(model.level);
    if (flowEl) flowEl.textContent = model.combo > 1 ? `x${model.combo}` : model.flow > 0.16 ? "Warm" : "Ready";
    if (pauseBtn) pauseBtn.disabled = state === "idle" || state === "gameover";
  }

  function getGhostPiece() {
    if (!model.current) return null;
    let ghostY = model.current.y;
    while (!collides(model.current.x, ghostY + 1, model.current.matrix)) {
      ghostY += 1;
    }
    return {
      theme: model.current.theme,
      cells: getPieceCells(model.current, ghostY),
    };
  }

  function getRenderablePiece(piece) {
    if (!piece) return null;
    return {
      key: piece.key,
      theme: piece.theme,
      cells: getPieceCells(piece),
    };
  }

  function getRenderableNext() {
    if (!model.next) return null;
    return {
      theme: model.next.theme,
      cells: matrixToCells(model.next.matrix, 0, 0),
    };
  }

  function update(dt) {
    background.update(dt, {
      flowIntensity: model.flow,
      speed: 180 + model.level * 26,
      environmentProgress: clamp(model.lines / 28, 0, 1),
    }, world);

    const activeBounds = model.current ? getPieceBounds(model.current) : null;
    effects.update(dt, {
      runner: activeBounds
        ? {
            x: activeBounds.x,
            y: activeBounds.y,
            width: activeBounds.width,
            height: activeBounds.height,
          }
        : null,
      flowIntensity: model.flow,
    });

    if (model.flashTimer > 0) {
      model.flashTimer = Math.max(0, model.flashTimer - dt);
      if (model.flashTimer === 0) {
        model.flashRows = [];
      }
    }

    if (state !== "playing" || !model.current) return;

    model.flow = Math.max(0, model.flow - dt * 0.03);
    model.dropAccumulator += dt * (model.softDrop ? 7 : 1);
    audio.setIntensity(clamp(0.22 + model.level * 0.08 + model.flow * 0.44, 0, 1));

    const grounded = collides(model.current.x, model.current.y + 1, model.current.matrix);
    if (!grounded && model.dropAccumulator >= getDropInterval()) {
      model.current.y += 1;
      model.dropAccumulator = 0;
      model.lockTimer = 0;
    } else if (grounded) {
      model.lockTimer += dt * (model.softDrop ? 1.4 : 1);
      if (model.lockTimer >= 0.36) {
        lockCurrentPiece();
      }
    } else {
      model.lockTimer = 0;
    }

    updateHud();
  }

  function getSnapshot() {
    return {
      board: model.board,
      active: getRenderablePiece(model.current),
      ghost: getGhostPiece(),
      next: getRenderableNext(),
      score: model.score,
      lines: model.lines,
      level: model.level,
      flowIntensity: model.flow,
      flowLabel: model.combo > 1 ? `x${model.combo}` : model.flow > 0.16 ? "Warm" : "Ready",
      nextLabel: model.next ? model.next.theme.name : "Better Mood",
      environmentProgress: clamp(model.lines / 28, 0, 1),
      flashRows: model.flashRows,
      modeLabel:
        state === "playing"
          ? `Nivel ${model.level}`
          : state === "paused"
            ? "Pausa"
            : state === "gameover"
              ? "Sigue el flow"
              : "Arcade Better Mood",
    };
  }

  function draw() {
    if (world.width < 40 || world.height < 40) return;
    ctx.clearRect(0, 0, world.width, world.height);
    renderer.draw(world, getSnapshot());
  }

  function loop(now) {
    if (!running) return;
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
    const boardRows = model.board.map((row) =>
      row.map((cell) => (cell ? cell.key : ".")).join("")
    );
    const active = model.current
      ? {
          key: model.current.key,
          x: model.current.x,
          y: model.current.y,
          cells: getPieceCells(model.current),
        }
      : null;
    return JSON.stringify({
      mode: state,
      board: {
        cols: COLS,
        rows: ROWS,
        origin: "top-left, x-right, y-down",
        cells: boardRows,
      },
      active,
      next: model.next ? model.next.key : null,
      score: model.score,
      lines: model.lines,
      level: model.level,
      combo: model.combo,
      flow: Number(model.flow.toFixed(2)),
    });
  }

  function handleAction(action) {
    if (!isActive) return;
    switch (action) {
      case "left":
        movePiece(-1);
        break;
      case "right":
        movePiece(1);
        break;
      case "rotate":
        rotatePiece();
        break;
      case "drop":
        hardDrop();
        break;
      default:
        break;
    }
  }

  document.addEventListener("keydown", (event) => {
    if (!isActive) return;
    if (event.repeat && ["ArrowUp", "Space"].includes(event.code)) return;

    if (state === "idle" && (event.code === "Enter" || event.code === "Space")) {
      event.preventDefault();
      startGame();
      return;
    }

    if (event.code === "KeyP") {
      event.preventDefault();
      if (state === "playing") pauseGame();
      else if (state === "paused") resumeGame();
      return;
    }

    if (event.code === "KeyF") {
      event.preventDefault();
      toggleFullscreen();
      return;
    }

    if (state !== "playing") return;

    switch (event.code) {
      case "ArrowLeft":
        event.preventDefault();
        movePiece(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        movePiece(1);
        break;
      case "ArrowUp":
      case "Space":
        event.preventDefault();
        rotatePiece();
        break;
      case "ArrowDown":
        event.preventDefault();
        model.softDrop = true;
        break;
      default:
        break;
    }
  });

  document.addEventListener("keyup", (event) => {
    if (!isActive) return;
    if (event.code === "ArrowDown") {
      model.softDrop = false;
    }
  });

  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      audio.resume();
      handleAction(button.dataset.arcadeAction);
    });
  });

  startBtn?.addEventListener("click", startGame);
  restartButtons.forEach((button) => button.addEventListener("click", startGame));
  resumeBtn?.addEventListener("click", resumeGame);
  pauseBtn?.addEventListener("click", () => {
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
  });
  fullscreenBtn?.addEventListener("click", toggleFullscreen);

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing") {
      pauseGame();
    }
  });

  const controller = {
    gameKey: root.dataset.gameKey || "stacks",
    renderGameToText,
    advanceTime: (ms) => advanceSimulation(ms),
    setActive(next) {
      isActive = Boolean(next);
      if (!isActive && state === "playing") {
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
