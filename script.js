const toggleButton = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
const header = document.querySelector(".header");
const API_BASE = "/api";

const setHeaderOffset = () => {
  if (!header) return;
  document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
};

setHeaderOffset();
window.addEventListener("resize", setHeaderOffset);
window.addEventListener("load", setHeaderOffset);

if (toggleButton && nav) {
  toggleButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggleButton.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggleButton.setAttribute("aria-expanded", "false");
    });
  });
}

const gameLink = document.querySelector(".nav__game");
const gameSection = document.querySelector("#droppy-dash");
const gamePlayButton = document.querySelector("[data-play]");

if (gameLink && gameSection) {
  gameLink.addEventListener("click", (event) => {
    event.preventDefault();
    gameSection.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      gamePlayButton?.focus({ preventScroll: true });
    }, 500);
  });
}

const orderDropdown = document.querySelector(".order-dropdown");
const orderSummary = orderDropdown?.querySelector("summary");

if (orderDropdown) {
  orderDropdown.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      orderDropdown.removeAttribute("open");
    });
  });

  document.addEventListener("click", (event) => {
    if (!orderDropdown.hasAttribute("open")) return;
    if (orderDropdown.contains(event.target)) return;
    orderDropdown.removeAttribute("open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!orderDropdown.hasAttribute("open")) return;
    orderDropdown.removeAttribute("open");
    orderSummary?.focus();
  });
}

const cateringForm = document.querySelector("[data-catering-form]");
const cateringNote = document.querySelector("[data-catering-note]");

const setCateringNote = (message, tone = "neutral") => {
  if (!cateringNote) return;
  cateringNote.textContent = message;
  if (tone === "error") {
    cateringNote.style.color = "#a6322c";
  } else if (tone === "success") {
    cateringNote.style.color = "#2f6b3a";
  } else {
    cateringNote.style.color = "rgba(35, 31, 32, 0.7)";
  }
};

if (cateringForm) {
  const submitButton = cateringForm.querySelector("button[type=submit]");
  cateringForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(cateringForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      date: String(formData.get("date") || "").trim(),
      guests: String(formData.get("guests") || "").trim(),
      details: String(formData.get("details") || "").trim(),
    };

    if (!payload.name) {
      setCateringNote("Ingresa tu nombre.", "error");
      return;
    }
    if (!payload.contact) {
      setCateringNote("Comparte un email o telefono.", "error");
      return;
    }
    if (!payload.date) {
      setCateringNote("Selecciona la fecha del evento.", "error");
      return;
    }
    const guestsNumber = Number(payload.guests);
    if (!Number.isFinite(guestsNumber) || guestsNumber < 1) {
      setCateringNote("Ingresa el numero de invitados.", "error");
      return;
    }

    setCateringNote("Enviando solicitud...");
    if (submitButton) submitButton.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/catering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar la solicitud.");
      }
      setCateringNote("Solicitud enviada. Te contactamos pronto.", "success");
      cateringForm.reset();
    } catch (err) {
      setCateringNote(err.message || "No se pudo enviar la solicitud.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

// Small header shadow on scroll for depth
window.addEventListener("scroll", () => {
  if (!header) return;
  const scrolled = window.scrollY > 8;
  header.style.boxShadow = scrolled ? "0 6px 18px rgba(35,31,32,0.06)" : "none";
});

const sendVisitPing = () => {
  const url = `${API_BASE}/visit`;
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, "");
    return;
  }
  fetch(url, { method: "POST", keepalive: true }).catch(() => {});
};

if (document.readyState === "complete") {
  sendVisitPing();
} else {
  window.addEventListener("load", sendVisitPing, { once: true });
}
