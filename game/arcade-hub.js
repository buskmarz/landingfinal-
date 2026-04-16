(() => {
  const hub = document.querySelector("[data-arcade-hub]");
  if (!hub) return;

  const titleEl = hub.querySelector("[data-stage-title]");
  const summaryEl = hub.querySelector("[data-stage-summary]");
  const noteEl = hub.querySelector("[data-stage-note]");
  const panels = Array.from(hub.querySelectorAll("[data-arcade-panel]"));
  const selectors = Array.from(document.querySelectorAll("[data-game-select]"));

  const copy = {
    stacks: {
      title: "Droppy Stacks",
      summary: "Puzzle de líneas limpias para entrar rápido y mantener el ritmo.",
      noteLabel: "Cómo se juega",
      noteText: "Mueve con flechas, gira con espacio y acelera con abajo. En móvil usa los botones táctiles.",
    },
    pinball: {
      title: "Droppy Pinball",
      summary: "Pinball ligero, claro y responsivo con bumpers Better Mood y controles directos.",
      noteLabel: "Cómo se juega",
      noteText: "Desktop: A y D o flechas para flippers, espacio para launch. Móvil: flippers grandes y launch central.",
    },
  };

  function syncGlobals(controller) {
    if (!controller) return;
    if (typeof controller.renderGameToText === "function") {
      window.render_game_to_text = controller.renderGameToText;
    }
    if (typeof controller.advanceTime === "function") {
      window.advanceTime = controller.advanceTime;
    }
  }

  function activateGame(key, scroll = false) {
    panels.forEach((panel) => {
      const isMatch = panel.dataset.arcadePanel === key;
      panel.hidden = !isMatch;
      panel.classList.toggle("is-active", isMatch);
      const root = panel.querySelector("[data-game-key]");
      root?.__arcadeStage?.setActive?.(isMatch);
      if (isMatch) {
        syncGlobals(root?.__arcadeStage);
      }
    });

    selectors.forEach((control) => {
      const isMatch = control.dataset.gameSelect === key;
      if (control.classList.contains("arcade-stage__tab")) {
        control.classList.toggle("is-active", isMatch);
        control.setAttribute("aria-selected", String(isMatch));
      }
      if (control.classList.contains("btn")) {
        control.classList.toggle("btn--primary", isMatch);
        control.classList.toggle("btn--secondary", !isMatch);
      }
    });

    const selectedCopy = copy[key];
    if (selectedCopy) {
      if (titleEl) titleEl.textContent = selectedCopy.title;
      if (summaryEl) summaryEl.textContent = selectedCopy.summary;
      if (noteEl) {
        noteEl.innerHTML = `
          <p class="arcade-note__label">${selectedCopy.noteLabel}</p>
          <p class="arcade-note__text">${selectedCopy.noteText}</p>
        `;
      }
    }

    if (window.location.hash !== `#${key}`) {
      history.replaceState(null, "", `#${key}`);
    }

    if (scroll) {
      const header = document.querySelector(".header");
      const headerOffset = header ? header.offsetHeight : 0;
      const top = hub.getBoundingClientRect().top + window.scrollY - headerOffset - 10;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  selectors.forEach((control) => {
    const key = control.dataset.gameSelect;
    if (!key || !copy[key]) return;
    control.addEventListener("click", () => activateGame(key, true));
  });

  const initialKey = window.location.hash === "#pinball" ? "pinball" : "stacks";
  activateGame(initialKey, false);
})();
