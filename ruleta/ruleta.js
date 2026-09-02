(() => {
  "use strict";

  const COLORS = ["#ffde00", "#231f20", "#ffba00", "#fffaf0"];
  const STORAGE_KEY = "better-mood-community-wheel-v2";

  const canvas = document.querySelector("#wheel");
  const context = canvas.getContext("2d");
  const participantsInput = document.querySelector("#participants");
  const participantCount = document.querySelector("#participantCount");
  const mobileParticipantCount = document.querySelector("#mobileParticipantCount");
  const mobileParticipantLabel = document.querySelector("#mobileParticipantLabel");
  const wheelStatus = document.querySelector("#wheelStatus");
  const methodsGuideLink = document.querySelector("#methodsGuideLink");
  const spinButton = document.querySelector("#spinButton");
  const wheelSpinButton = document.querySelector("#wheelSpinButton");
  const autoRemove = document.querySelector("#autoRemove");
  const showNames = document.querySelector("#showNames");
  const confettiEnabled = document.querySelector("#confettiEnabled");
  const soundSetting = document.querySelector("#soundSetting");
  const spinDuration = document.querySelector("#spinDuration");
  const soundButton = document.querySelector("#soundButton");
  const editor = document.querySelector("#editor");
  const editorBackdrop = document.querySelector("#editorBackdrop");
  const winnerDialog = document.querySelector("#winnerDialog");
  const winnerLabel = document.querySelector("#winnerLabel");
  const copiedMessage = document.querySelector("#copiedMessage");
  const confetti = document.querySelector("#confetti");
  const removeWinnerButton = document.querySelector("#removeWinnerButton");
  const fileInput = document.querySelector("#fileInput");
  const fullscreenButton = document.querySelector("#fullscreenButton");
  const historyList = document.querySelector("#historyList");
  const historyCount = document.querySelector("#historyCount");
  const emptyHistory = document.querySelector("#emptyHistory");

  let names = [];
  let history = [];
  let currentWinner = "";
  let currentRotation = 0;
  let spinning = false;
  let soundEnabled = true;
  let audioContext;
  let spinTimer = 0;
  let spinState = null;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function track(eventName, cta) {
    const host = window.location.hostname.toLowerCase();
    const isPublicHost = host === "bmoodcoffee.com" || host === "www.bmoodcoffee.com" || /\.netlify\.(app|com)$/.test(host);
    if (!isPublicHost) return;
    const payload = JSON.stringify({
      event: eventName,
      cta,
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

  function parseNames(value) {
    const seen = new Set();
    return value
      .split(/[\n,;\t]+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLocaleLowerCase("es-MX");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100);
  }

  function secureRandomIndex(max) {
    if (max <= 0) return -1;
    const ceiling = Math.floor(0x100000000 / max) * max;
    const value = new Uint32Array(1);
    do window.crypto.getRandomValues(value); while (value[0] >= ceiling);
    return value[0] % max;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        participants: participantsInput.value,
        autoRemove: autoRemove.checked,
        showNames: showNames.checked,
        confettiEnabled: confettiEnabled.checked,
        spinDuration: spinDuration.value,
        soundEnabled,
        history,
      }));
    } catch (_error) {
      // The wheel still works when browser storage is unavailable.
    }
  }

  function loadState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!state) return;
      if (typeof state.participants === "string") participantsInput.value = state.participants;
      autoRemove.checked = Boolean(state.autoRemove);
      showNames.checked = state.showNames !== false;
      confettiEnabled.checked = state.confettiEnabled !== false;
      if (["3000", "5200", "8000"].includes(state.spinDuration)) spinDuration.value = state.spinDuration;
      soundEnabled = state.soundEnabled !== false;
      if (Array.isArray(state.history)) {
        history = state.history
          .filter((entry) => entry && typeof entry.name === "string" && typeof entry.at === "string")
          .slice(0, 20);
      }
    } catch (_error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function resizeCanvas() {
    const size = Math.min(1100, Math.max(720, Math.round(canvas.clientWidth * window.devicePixelRatio)));
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    drawWheel();
  }

  function shorten(name, maxLength) {
    return name.length <= maxLength ? name : `${name.slice(0, Math.max(3, maxLength - 1))}…`;
  }

  function drawWheel() {
    const size = canvas.width;
    const center = size / 2;
    const radius = size * .475;
    context.clearRect(0, 0, size, size);
    context.save();
    context.translate(center, center);

    if (!names.length) {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fillStyle = "#e7e0d3";
      context.fill();
      context.lineWidth = size * .018;
      context.strokeStyle = "#231f20";
      context.stroke();
      context.fillStyle = "#716b64";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `850 ${size * .031}px Metropolis, system-ui, sans-serif`;
      context.fillText("AGREGA PARTICIPANTES", 0, -size * .19);
      context.restore();
      return;
    }

    const segment = Math.PI * 2 / names.length;
    const startOffset = -Math.PI / 2 - segment / 2;

    names.forEach((name, index) => {
      const start = startOffset + index * segment;
      const end = start + segment;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, radius, start, end);
      context.closePath();
      context.fillStyle = COLORS[index % COLORS.length];
      context.fill();
      context.lineWidth = Math.max(2, size * .004);
      context.strokeStyle = "#231f20";
      context.stroke();

      if (showNames.checked && names.length <= 40) {
        context.save();
        context.rotate(start + segment / 2);
        context.translate(radius * .64, 0);
        context.fillStyle = index % COLORS.length === 1 ? "#ffffff" : "#231f20";
        context.textAlign = "center";
        context.textBaseline = "middle";
        const fontSize = names.length <= 12 ? size * .027 : names.length <= 24 ? size * .019 : size * .014;
        const maxLength = names.length <= 12 ? 18 : names.length <= 24 ? 13 : 9;
        context.font = `850 ${fontSize}px Metropolis, system-ui, sans-serif`;
        context.fillText(shorten(name, maxLength), 0, 0, radius * .48);
        context.restore();
      }
    });

    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.lineWidth = size * .018;
    context.strokeStyle = "#231f20";
    context.stroke();
    context.restore();
  }

  function updateNames(message) {
    names = parseNames(participantsInput.value);
    participantCount.textContent = names.length;
    mobileParticipantCount.textContent = names.length;
    mobileParticipantLabel.textContent = names.length === 1 ? "participante" : "participantes";
    wheelStatus.textContent = message || `${names.length} participante${names.length === 1 ? "" : "s"}`;
    spinButton.disabled = names.length < 2 || spinning;
    wheelSpinButton.disabled = names.length < 2 || spinning;
    drawWheel();
    saveState();
  }

  function normalizeParticipantInput(message = "Lista limpia") {
    const cleaned = parseNames(participantsInput.value);
    participantsInput.value = cleaned.join("\n");
    updateNames(`${message} · ${cleaned.length} participante${cleaned.length === 1 ? "" : "s"}`);
  }

  function renderHistory() {
    historyCount.textContent = history.length;
    historyList.replaceChildren();
    emptyHistory.hidden = history.length > 0;
    history.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry.name;
      const time = document.createElement("span");
      const date = new Date(entry.at);
      time.textContent = Number.isNaN(date.getTime())
        ? "Sorteo anterior"
        : date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
      item.appendChild(time);
      historyList.appendChild(item);
    });
  }

  function tick(strength = .035, frequency = 520) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(strength, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .055);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + .06);
    } catch (_error) {
      soundEnabled = false;
      syncSoundButton();
    }
  }

  function playSpinTicks(duration) {
    if (!soundEnabled) return;
    let elapsed = 0;
    const schedule = () => {
      if (!spinning || elapsed >= duration - 180) return;
      tick(.02, 480 + Math.random() * 80);
      const progress = elapsed / duration;
      const interval = 72 + Math.pow(progress, 3) * 310;
      elapsed += interval;
      window.setTimeout(schedule, interval);
    };
    schedule();
  }

  function celebrate() {
    tick(.07, 740);
    window.setTimeout(() => tick(.075, 980), 120);
    if (reducedMotion.matches || !confettiEnabled.checked) return;
    confetti.innerHTML = "";
    const palette = ["#ffde00", "#ffba00", "#231f20", "#ffffff", "#f08b5d"];
    for (let index = 0; index < 45; index += 1) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = palette[index % palette.length];
      piece.style.setProperty("--fall", `${2.1 + Math.random() * 1.7}s`);
      piece.style.setProperty("--delay", `${Math.random() * .25}s`);
      piece.style.setProperty("--drift", `${-130 + Math.random() * 260}px`);
      confetti.appendChild(piece);
    }
    window.setTimeout(() => { confetti.innerHTML = ""; }, 4200);
  }

  function removeCurrentWinner(spinAfter = false) {
    if (!currentWinner) return;
    const target = currentWinner.toLocaleLowerCase("es-MX");
    const updated = parseNames(participantsInput.value).filter((name) => name.toLocaleLowerCase("es-MX") !== target);
    participantsInput.value = updated.join("\n");
    updateNames(`${updated.length} participante${updated.length === 1 ? "" : "s"}`);
    if (spinAfter) {
      winnerDialog.close();
      if (updated.length >= 2) window.setTimeout(spin, 180);
    }
  }

  function showWinner(winner) {
    currentWinner = winner;
    history.unshift({ name: winner, at: new Date().toISOString() });
    history = history.slice(0, 20);
    renderHistory();
    winnerLabel.textContent = winner;
    copiedMessage.textContent = "";
    if (autoRemove.checked) {
      removeCurrentWinner(false);
      removeWinnerButton.textContent = names.length >= 2 ? "Girar otra vez" : "Cerrar";
    } else {
      removeWinnerButton.textContent = "Quitar y seguir";
    }
    saveState();
    celebrate();
    track("roulette_winner", `roulette-winner-${names.length}-participants`);
    winnerDialog.showModal();
  }

  function finishSpin() {
    if (!spinning || !spinState) return;
    const { winner } = spinState;
    window.clearTimeout(spinTimer);
    spinTimer = 0;
    spinState = null;
    spinning = false;
    participantsInput.disabled = false;
    spinButton.disabled = names.length < 2;
    wheelSpinButton.disabled = names.length < 2;
    wheelStatus.textContent = `Ganador: ${winner}`;
    showWinner(winner);
  }

  function spin() {
    if (spinning || names.length < 2) {
      if (names.length < 2) wheelStatus.textContent = "Agrega 2 participantes";
      return;
    }

    closeEditor();
    spinning = true;
    spinButton.disabled = true;
    wheelSpinButton.disabled = true;
    participantsInput.disabled = true;
    wheelStatus.textContent = "Girando…";
    track("roulette_spin", `roulette-spin-${names.length}-participants`);

    const selectedIndex = secureRandomIndex(names.length);
    const winner = names[selectedIndex];
    const degreesPerSegment = 360 / names.length;
    const currentModulo = ((currentRotation % 360) + 360) % 360;
    const jitter = (Math.random() - .5) * degreesPerSegment * .44;
    const desiredModulo = ((-selectedIndex * degreesPerSegment + jitter) % 360 + 360) % 360;
    const alignment = (desiredModulo - currentModulo + 360) % 360;
    currentRotation += (7 + secureRandomIndex(4)) * 360 + alignment;
    const configuredDuration = Number.parseInt(spinDuration.value, 10) || 5200;
    const duration = reducedMotion.matches ? 350 : configuredDuration;
    spinState = { winner, selectedIndex, duration, remaining: duration + 90 };

    canvas.style.transitionDuration = `${duration}ms`;
    requestAnimationFrame(() => { canvas.style.transform = `rotate(${currentRotation}deg)`; });
    playSpinTicks(duration);

    spinTimer = window.setTimeout(finishSpin, duration + 90);
  }

  function openEditor() {
    editor.classList.add("is-open");
    editorBackdrop.classList.add("is-visible");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => participantsInput.focus(), 180);
  }

  function closeEditor() {
    editor.classList.remove("is-open");
    editorBackdrop.classList.remove("is-visible");
    document.body.style.overflow = "";
  }

  function syncSoundButton() {
    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    soundButton.setAttribute("aria-label", soundEnabled ? "Desactivar sonido" : "Activar sonido");
    soundSetting.checked = soundEnabled;
  }

  participantsInput.addEventListener("input", () => updateNames());
  participantsInput.addEventListener("blur", () => normalizeParticipantInput("Lista actualizada"));
  autoRemove.addEventListener("change", saveState);
  showNames.addEventListener("change", () => { drawWheel(); saveState(); });
  confettiEnabled.addEventListener("change", saveState);
  spinDuration.addEventListener("change", saveState);
  soundSetting.addEventListener("change", () => {
    soundEnabled = soundSetting.checked;
    syncSoundButton();
    if (soundEnabled) tick();
    saveState();
  });
  spinButton.addEventListener("click", spin);
  wheelSpinButton.addEventListener("click", spin);
  methodsGuideLink.addEventListener("click", () => track("roulette_guide_open", "guide-methods"));

  document.querySelector("#shuffleButton").addEventListener("click", () => {
    const shuffled = [...names];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = secureRandomIndex(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    participantsInput.value = shuffled.join("\n");
    updateNames("Lista mezclada");
  });

  document.querySelector("#cleanButton").addEventListener("click", () => normalizeParticipantInput());

  document.querySelector("#clearButton").addEventListener("click", () => {
    participantsInput.value = "";
    updateNames("Agrega 2 participantes");
    participantsInput.focus();
  });

  document.querySelector("#clearHistoryButton").addEventListener("click", () => {
    history = [];
    renderHistory();
    saveState();
    wheelStatus.textContent = "Historial borrado";
  });

  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    syncSoundButton();
    if (soundEnabled) tick();
    saveState();
  });

  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_error) {
      wheelStatus.textContent = "Pantalla completa no disponible";
    }
  });

  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.querySelector("span").textContent = document.fullscreenElement ? "Salir de pantalla completa" : "Pantalla completa";
  });

  document.querySelector("#importButton").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      participantsInput.value = await file.text();
      updateNames("Lista importada");
    } catch (_error) {
      wheelStatus.textContent = "No se pudo leer la lista";
    }
    fileInput.value = "";
  });

  document.querySelector("#exportButton").addEventListener("click", () => {
    const blob = new Blob([names.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "participantes-better-mood.txt";
    link.click();
    URL.revokeObjectURL(url);
    wheelStatus.textContent = "Lista descargada";
  });

  document.querySelector("#openEditorButton").addEventListener("click", openEditor);
  document.querySelector("#closeEditorButton").addEventListener("click", closeEditor);
  editorBackdrop.addEventListener("click", closeEditor);
  document.querySelector("#closeDialogButton").addEventListener("click", () => winnerDialog.close());
  document.querySelector("#removeWinnerButton").addEventListener("click", () => {
    if (autoRemove.checked) {
      winnerDialog.close();
      if (names.length >= 2) window.setTimeout(spin, 180);
      return;
    }
    removeCurrentWinner(true);
  });

  document.querySelector("#copyWinnerButton").addEventListener("click", async () => {
    const text = `🎉 ${currentWinner} ganó el sorteo de Better Mood Coffee.`;
    try {
      await navigator.clipboard.writeText(text);
      copiedMessage.textContent = "Copiado";
    } catch (_error) {
      copiedMessage.textContent = currentWinner;
    }
  });

  winnerDialog.addEventListener("click", (event) => {
    if (event.target === winnerDialog) winnerDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    const isInteractive = ["TEXTAREA", "INPUT", "SELECT", "BUTTON", "SUMMARY"].includes(tag);
    if (event.key === "Escape") closeEditor();
    if (event.code === "Space" && !isInteractive && !winnerDialog.open) {
      event.preventDefault();
      spin();
    }
    if (event.key.toLowerCase() === "f" && !isInteractive) fullscreenButton.click();
  });

  window.render_game_to_text = () => JSON.stringify({
    coordinateSystem: "Canvas 960x960; origen en la esquina superior izquierda; x aumenta a la derecha, y hacia abajo.",
    mode: spinning ? "spinning" : winnerDialog.open ? "winner" : names.length < 2 ? "setup" : "ready",
    participants: names,
    participantCount: names.length,
    wheelRotationDegrees: Math.round(currentRotation * 100) / 100,
    winner: currentWinner || null,
    spin: spinState ? { selectedIndex: spinState.selectedIndex, remainingMs: spinState.remaining } : null,
    settings: {
      durationMs: Number.parseInt(spinDuration.value, 10),
      autoRemoveWinner: autoRemove.checked,
      showNames: showNames.checked,
      confetti: confettiEnabled.checked,
      sound: soundEnabled,
    },
    history: history.slice(0, 5),
  });

  window.advanceTime = (ms) => {
    if (!spinning || !spinState || !Number.isFinite(ms) || ms <= 0) return;
    spinState.remaining -= ms;
    if (spinState.remaining <= 0) finishSpin();
  };

  window.addEventListener("resize", resizeCanvas);
  loadState();
  syncSoundButton();
  updateNames();
  renderHistory();
  resizeCanvas();
})();
