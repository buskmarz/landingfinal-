const toggleButton = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
const header = document.querySelector(".header");
const API_BASE = "/api";
const IS_LOCAL_PREVIEW = ["127.0.0.1", "localhost"].includes(window.location.hostname);

const applySiteDataLinks = () => {
  const siteData = window.BETTER_MOOD_SITE_DATA;
  if (!siteData?.links) return;

  document.querySelectorAll("[data-site-link]").forEach((element) => {
    const key = element.getAttribute("data-site-link");
    const href = siteData.links[key];
    if (href) element.setAttribute("href", href);
  });

  document.querySelectorAll('[data-site-text="googleTrust"]').forEach((element) => {
    const business = siteData.business || {};
    const rating = business.googleRating || "4.4";
    const reviews = business.googleReviewCount || "168";
    const place = `${business.neighborhood || "La Paz"}, ${business.city || "Puebla"}`;
    element.textContent = `⭐ ${rating}/5 en Google · ${reviews} reseñas · ${place}`;
  });
};

applySiteDataLinks();

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

const scrollToGameSection = (behavior = "smooth") => {
  if (!gameSection) return;
  const headerOffset = header ? header.offsetHeight : 0;
  const top = gameSection.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top, behavior });
  window.setTimeout(() => {
    gamePlayButton?.focus({ preventScroll: true });
  }, 500);
};

if (gameLink && gameSection) {
  gameLink.addEventListener("click", (event) => {
    const href = gameLink.getAttribute("href") || "";
    if (!href.startsWith("#")) return;
    event.preventDefault();
    nav?.classList.remove("is-open");
    toggleButton?.setAttribute("aria-expanded", "false");
    scrollToGameSection("smooth");
  });
}

if (gameSection) {
  const handleGameHash = () => {
    if (window.location.hash === "#droppy-dash") {
      scrollToGameSection("auto");
      window.setTimeout(() => scrollToGameSection("auto"), 600);
    }
  };
  if (document.readyState === "complete") {
    handleGameHash();
  } else {
    window.addEventListener("load", handleGameHash, { once: true });
  }
  window.addEventListener("hashchange", handleGameHash);
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

const buildCateringMessage = (payload) => {
  const lines = [
    "Cotizacion mesa de cafe",
    `Nombre: ${payload.name}`,
    `Contacto: ${payload.contact}`,
    `Fecha: ${payload.date}`,
    `Invitados: ${payload.guests}`,
  ];
  if (payload.details) {
    lines.push(`Detalles: ${payload.details}`);
  }
  return lines.join("\n");
};

const getCateringWhatsappUrl = (message) => {
  const base = cateringForm?.dataset.whatsapp || "";
  const text = encodeURIComponent(message);
  if (base) {
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
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

    const whatsappMessage = buildCateringMessage(payload);
    const whatsappUrl = getCateringWhatsappUrl(whatsappMessage);

    setCateringNote("Abriendo WhatsApp y enviando solicitud...");
    if (submitButton) submitButton.disabled = true;
    window.open(whatsappUrl, "_blank");

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
  if (IS_LOCAL_PREVIEW) return;
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

const sendConversionEvent = (target) => {
  if (IS_LOCAL_PREVIEW || !target) return;
  const eventName = target.getAttribute("data-event");
  if (!eventName) return;

  const payload = {
    event: eventName,
    cta: target.getAttribute("data-cta") || "",
    path: window.location.pathname,
    href: target.getAttribute("href") || "",
  };
  const url = `${API_BASE}/track-event`;
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
};

document.addEventListener(
  "click",
  (event) => {
    const target = event.target.closest("[data-event]");
    if (!target) return;
    sendConversionEvent(target);
  },
  { capture: true }
);

const recomendadorRoot = document.querySelector("[data-recomendador]");
if (recomendadorRoot) {
  const resultEl = recomendadorRoot.querySelector("[data-reco-result]");
  const ctaBtn = recomendadorRoot.querySelector("[data-reco-cta]");
  const resetBtn = recomendadorRoot.querySelector("[data-reco-reset]");
  const modal = recomendadorRoot.querySelector("[data-reco-modal]");
  const modalTitle = recomendadorRoot.querySelector("#reco-desc-title");
  const modalBody = recomendadorRoot.querySelector("#reco-desc-text");
  const modalClose = recomendadorRoot.querySelector("[data-reco-modal-close]");

  const menu = [
    // Latte especial (con sabores)
    { nombre: "Latte lavanda", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: ["energizante", "despegue"] },
    { nombre: "Latte caramelo", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: ["energizante", "despegue"] },
    { nombre: "Latte vainilla", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: ["energizante", "despegue"] },
    { nombre: "Latte horchata", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: ["energizante", "despegue"] },
    { nombre: "Latte pistache", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: ["energizante", "despegue"] },
    { nombre: "Latte pumpkin", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: ["energizante", "despegue"] },

    // Sodas italianas
    { nombre: "Soda lavanda", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Soda fresa", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Soda durazno", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Soda mango", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Soda manzana", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Soda manzana verde", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Soda maracuyá", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Soda mixed berries", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Soda coco", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "neutro" },

    // Cafés de especialidad
    { nombre: "V60", disponible_en: ["caliente"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Chemex", disponible_en: ["caliente"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Prensa francesa", disponible_en: ["caliente"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Aeropress", disponible_en: ["caliente"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Espresso", disponible_en: ["caliente"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Americano", disponible_en: ["caliente"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Cappuccino", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: "energizante" },
    { nombre: "Flat white", disponible_en: ["caliente"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Dirty chai", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: "energizante" },

    // Bebidas sin café
    { nombre: "Matcha", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "energizante" },
    { nombre: "Matcha organico", disponible_en: ["caliente", "fría"], dulce: false, cafeina: false, efecto: "energizante" },
    { nombre: "Taro sin azúcar", disponible_en: ["caliente", "fría"], dulce: false, cafeina: false, efecto: "neutro" },
    { nombre: "Mango Matcha", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "energizante" },
    { nombre: "Strawberry Matcha", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "energizante" },
    { nombre: "Taro", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Chai", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Golden milk", disponible_en: ["caliente"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Chocolate", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "neutro" },

    // Nuevas bebidas
    { nombre: "Mocha Better", disponible_en: ["fría"], dulce: true, cafeina: true, efecto: "energizante" },
    { nombre: "Cold tonic boost", disponible_en: ["fría"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Cold brew + tonic", disponible_en: ["fría"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Cold brew", disponible_en: ["fría"], dulce: false, cafeina: true, efecto: "energizante" },
    { nombre: "Affogato", disponible_en: ["fría"], dulce: true, cafeina: true, efecto: "energizante" },

    // Nuevas 2025-09: Cocochata & Yakoold
    { nombre: "Latte Cocochata", disponible_en: ["caliente", "fría"], dulce: true, cafeina: true, efecto: "energizante" },
    { nombre: "Matcha Cocochata", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "energizante" },
    { nombre: "Yakoold Brew", disponible_en: ["fría"], dulce: true, cafeina: true, efecto: "energizante" },

    // Tés y tisanas
    { nombre: "Tisana frutos rojos", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Tisana frutos dorados", disponible_en: ["caliente", "fría"], dulce: true, cafeina: false, efecto: "neutro" },
    { nombre: "Te bugambilia-canela", disponible_en: ["caliente", "fría"], dulce: false, cafeina: false, efecto: "neutro" },
    { nombre: "Te lavanda-manzanilla", disponible_en: ["caliente", "fría"], dulce: false, cafeina: false, efecto: "relajante" },
    { nombre: "Te verde-limon", disponible_en: ["caliente", "fría"], dulce: false, cafeina: false, efecto: "energizante" },

    // Smoothies
    { nombre: "Smoothie energy mango", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "energizante" },
    { nombre: "Smoothie brain taro", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "energizante" },
    { nombre: "Smoothie strawberry relax", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "relajante" },

    // Especiales
    { nombre: "Spaceman", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "despegue" },
    { nombre: "Sweet trip", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "despegue" },
    { nombre: "Nirvana lavender", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "relajante" },
    { nombre: "Dragon's blood", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "relajante" },
    { nombre: "Cold Berry Days", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "relajante" },
    { nombre: "Tango Zen", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "relajante" },
    { nombre: "Strawberry & Mango CBD Matcha", disponible_en: ["fría"], dulce: true, cafeina: false, efecto: "relajante" },
    { nombre: "Magic Mocha Cookies", disponible_en: ["fría"], dulce: true, cafeina: true, efecto: "despegue" },
  ];

  const DESCRIPCIONES = {
    // Creaciones
    "Nirvana lavender": "Soda italiana de lavanda y limón con CBD calming. 430 ml.",
    "Dragon's blood": "Soda italiana de mango, durazno y fresa con CBD calming. 430 ml.",
    "Strawberry & Mango CBD Matcha": "Fresa o mango macerado, leche de almendra, miel de agave, matcha y CBD cúrcuma wellness. 430 ml.",
    "Cold Berry Days": "Macerado de berries con ginger ale y CBD calming. 430 ml.",
    "Spaceman": "Lavanda, limón y agua mineral. 240 ml.",
    "Sweet trip": "Berries, perlas de fresa y agua mineral; perfil dulce y refrescante. 240 ml.",
    "Tango Zen": "Refrescante soda italiana de mango y maracuyá con CBD calming. 430 ml.",
    "Mocha Better": "Chocolate artesanal de Oaxaca con espresso y miel de agave.",
    "Latte Cocochata": "Latte suave con horchata cremosa y un toque tropical de coco. 480 ml.",
    "Matcha Cocochata": "Matcha latte con horchata cremosa y un toque de coco. 480 ml (orgánico o endulzado).",
    "Yakoold Brew": "Cold brew con un toque de Yakult; refrescante y único. 360 ml.",
    // Smoothies
    "Smoothie energy mango": "Mango, yogurt griego, leche de avena, cordyceps, eleuthero y rhodiola. 430 ml.",
    "Smoothie brain taro": "Plátano, frutos rojos, taro, yogurt griego, leche de almendra, melena de león, gotu kola, rhodiola y ginkgo. 430 ml.",
    "Smoothie strawberry relax": "Fresa, plátano, vainilla, leche de almendra, yogurt griego, tulsi, reishi y ashwagandha. 430 ml.",
    // Clásicos café
    Espresso: "Shot concentrado de café (≈30 ml), intenso y aromático.",
    Americano: "Espresso extendido con agua caliente; taza limpia y balanceada.",
    Cappuccino: "Espresso con leche vaporizada y una capa de espuma cremosa.",
    "Flat white": "Doble espresso con microespuma de leche; textura sedosa.",
    Affogato: "Helado de vainilla coronado con un espresso caliente.",
    "Cold brew": "Café infusionado en frío por largas horas; suave y refrescante.",
    "Cold brew + tonic": "Cold brew con agua tónica y hielo; cítrico y burbujeante.",
    "Cold tonic boost": "Espresso frío con agua tónica; amargo-dulce y muy refrescante.",
    V60: "Método de filtro con taza limpia, dulce y aromática.",
    Chemex: "Método de filtro con gran claridad y cuerpo ligero.",
    "Prensa francesa": "Método por inmersión, cuerpo medio-alto y aroma intenso.",
    Aeropress: "Método versátil con notas intensas y cuerpo medio.",
    // Tés y tisanas
    "Te verde-limon": "Té verde con limón; refrescante y ligeramente cítrico.",
    "Te lavanda-manzanilla": "Infusión relajante de lavanda y manzanilla.",
    "Te bugambilia-canela": "Infusión floral con bugambilia y toque de canela.",
    "Tisana frutos rojos": "Infusión frutal de frutos rojos, sin cafeína.",
    "Tisana frutos dorados": "Infusión cálida con notas frutales, sin cafeína.",
    // Sin café
    Matcha: "Té verde japonés batido con leche; energía suave y sostenida.",
    "Matcha organico": "Matcha orgánico, perfil vegetal y limpio.",
    "Mango Matcha": "Matcha con mango; equilibrio entre frutal y herbal.",
    "Strawberry Matcha": "Matcha con fresa; dulce y refrescante.",
    Chai: "Té negro especiado con leche y notas de canela y cardamomo.",
    "Dirty chai": "Chai latte con un shot de espresso para un extra de energía.",
    Taro: "Bebida cremosa de taro con notas a vainilla.",
    "Golden milk": "Leche especiada con cúrcuma; cálida y reconfortante.",
    Chocolate: "Chocolate de Oaxaca (oscuro, blanco o artesanal).",
    // Sodas
    "Soda lavanda": "Soda italiana de lavanda con agua mineral y hielo.",
    "Soda fresa": "Soda italiana de fresa con agua mineral.",
    "Soda durazno": "Soda italiana de durazno; dulce y aromática.",
    "Soda mango": "Soda italiana de mango; muy refrescante.",
    "Soda manzana": "Soda italiana de manzana; suave y frutal.",
    "Soda manzana verde": "Soda italiana de manzana verde; toque ácido y fresco.",
    "Soda maracuyá": "Soda italiana de maracuyá; tropical y cítrica.",
    "Soda mixed berries": "Soda italiana de frutos rojos.",
    "Soda coco": "Soda italiana de coco; dulce y cremosa.",
  };

  const RESET_MS = 60000;
  let idleTimer = null;
  let hasInteracted = false;

  const scrollToResultado = () => {
    if (!resultEl) return;
    try {
      resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      try {
        resultEl.scrollIntoView(true);
      } catch (_) {
        const y = resultEl.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);
        window.scrollTo(0, y);
      }
    }
    resultEl.classList.add("is-highlight");
    window.setTimeout(() => resultEl.classList.remove("is-highlight"), 800);
  };

  const getSelected = (name) => {
    const group = recomendadorRoot.querySelector(`.reco__group[data-name="${name}"]`);
    const selected = group?.querySelector(".reco__option.is-selected");
    return selected ? selected.getAttribute("data-value") : null;
  };

  const updateCTA = () => {
    if (!ctaBtn) return;
    const requiredGroups = recomendadorRoot.querySelectorAll('.reco__group[data-required="true"]');
    let complete = true;
    requiredGroups.forEach((group) => {
      if (!group.querySelector(".reco__option.is-selected")) complete = false;
    });
    ctaBtn.disabled = !complete;
  };

  const descripcionGenerica = (nombre) => {
    if (/^Latte\s/i.test(nombre)) {
      const sabor = nombre.replace(/^Latte\s/i, "");
      return `Espresso con leche y jarabe de ${sabor.toLowerCase()}.`;
    }
    if (/^Smoothie/i.test(nombre)) return "Smoothie frutal 430 ml.";
    if (/^Soda/i.test(nombre)) return "Soda italiana con agua mineral.";
    return "Consulta en barra los detalles y variaciones.";
  };

  const getDescripcionByName = (nombre) => {
    if (DESCRIPCIONES[nombre]) return DESCRIPCIONES[nombre];
    return descripcionGenerica(nombre);
  };

  const openDescripcion = (nombre) => {
    if (!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = nombre;
    modalBody.textContent = getDescripcionByName(nombre);
    modal.classList.add("is-open");
    const close = () => {
      modal.classList.remove("is-open");
      cleanup();
    };
    const esc = (event) => {
      if (event.key === "Escape") close();
    };
    const bg = (event) => {
      if (event.target === modal) close();
    };
    function cleanup() {
      modal.removeEventListener("click", bg);
      document.removeEventListener("keydown", esc);
      modalClose?.removeEventListener("click", close);
    }
    modal.addEventListener("click", bg);
    document.addEventListener("keydown", esc);
    modalClose?.addEventListener("click", close);
  };

  const nextConsultaSeq = () => {
    try {
      const key = "bm_consulta_seq";
      const n = parseInt(localStorage.getItem(key) || "0", 10) + 1;
      localStorage.setItem(key, String(n));
      return n;
    } catch (err) {
      return Math.floor(Date.now() / 1000);
    }
  };

  const shortId = () => {
    try {
      if (globalThis.crypto && globalThis.crypto.randomUUID) {
        return globalThis.crypto.randomUUID().split("-")[0].toUpperCase();
      }
    } catch (_) {}
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase();
  };

  const encodeBody = (data) =>
    Object.keys(data)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join("&");

  const isNetlifyHost = () => {
    try {
      const hostname = (location?.hostname || "").toLowerCase();
      if (!hostname) return false;
      if (hostname === "localhost" || hostname === "127.0.0.1") return false;
      return /\.netlify\.(app|com)$/.test(hostname);
    } catch (_) {
      return false;
    }
  };

  const submitConsultaLog = (payload) => {
    if (!isNetlifyHost()) return;
    const body = encodeBody({ "form-name": "consultas", ...payload });
    try {
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }).catch(() => {});
    } catch (_) {
      // ignore
    }
  };

  const trackRecommendation = (ev) => {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "recommendation", ...ev });
    } catch (_) {
      // ignore
    }
  };

  const generarPDFRecomendaciones = ({ title, consultaId, chips, recomendaciones }) => {
    const width = 595;
    const height = 842;
    const margin = 48;
    const lines = [];
    const esc = (str) => String(str).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    lines.push(`BT /F1 18 Tf 50 780 Td (${esc(title)}) Tj ET`);
    lines.push(`BT /F1 11 Tf 50 760 Td (Consulta: ${esc(consultaId)}) Tj ET`);
    lines.push(`BT /F1 11 Tf 50 742 Td (Preferencias: ${esc(chips)}) Tj ET`);
    let y = 720;
    lines.push(`BT /F1 13 Tf 50 ${y} Td (Bebidas recomendadas) Tj ET`);
    y -= 18;
    recomendaciones.forEach((name, index) => {
      y -= 16;
      if (y < margin) y = margin;
      lines.push(`BT /F1 11 Tf 60 ${y} Td (${esc(`${index + 1}. ${name}`)}) Tj ET`);
    });
    const contentStream = lines.join("\n");
    const contentLen = new TextEncoder().encode(contentStream).length;
    const chunks = [];
    let offset = 0;
    const xref = [];
    const pushStr = (str) => {
      const bytes = new TextEncoder().encode(str);
      chunks.push(bytes);
      offset += bytes.length;
    };
    const addObj = (id, body) => {
      xref[id] = offset;
      pushStr(`${id} 0 obj\n${body}\nendobj\n`);
    };
    pushStr("%PDF-1.4\n");
    pushStr("%\xFF\xFF\xFF\xFF\n");
    addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>`);
    addObj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    addObj(5, `<< /Length ${contentLen} >>\nstream\n${contentStream}\nendstream`);
    const xrefStart = offset;
    let xrefTable = "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i += 1) {
      xrefTable += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    pushStr(xrefTable + trailer);
    return new Blob(chunks, { type: "application/pdf" });
  };

  const recomendar = () => {
    const tipo = getSelected("tipo");
    const cafeinaVal = getSelected("cafeina");
    const dulceVal = getSelected("dulce");
    const efecto = getSelected("efecto") || "ninguno";
    const cafeina = cafeinaVal === "si";
    const dulce = dulceVal === "si";

    let recomendaciones = menu.filter(
      (b) =>
        tipo &&
        b.disponible_en.includes(tipo) &&
        b.cafeina === cafeina &&
        b.dulce === dulce &&
        (efecto === "ninguno" || (Array.isArray(b.efecto) ? b.efecto.includes(efecto) : b.efecto === efecto))
    );

    if (recomendaciones.length === 0 && efecto !== "ninguno") {
      recomendaciones = menu.filter(
        (b) => tipo && b.disponible_en.includes(tipo) && b.cafeina === cafeina && b.dulce === dulce
      );
      if (recomendaciones.length > 0) {
        recomendaciones.push({
          nombre: "✨ Puedes personalizar esta bebida con nuestro jarabe favorito y una dosis de tintura especial para sentirte como quieres.",
          disponible_en: [tipo],
          dulce: true,
          cafeina,
          efecto,
        });
      }
    }

    if (!resultEl) return;
    const consultaSeq = nextConsultaSeq();
    const consultaId = shortId();

    if (recomendaciones.length > 0) {
      const chipValues = [];
      if (tipo) chipValues.push(tipo);
      chipValues.push(cafeina ? "con cafeína" : "sin cafeína");
      chipValues.push(dulce ? "dulce" : "no dulce");
      if (efecto && efecto !== "ninguno") chipValues.push(efecto);
      const chipsHtml = chipValues.map((chip) => `<span class="reco__pill">${chip}</span>`).join("");

      const folioStr = `Recomendación #${consultaSeq} · ID ${consultaId}`;
      let salida = `<div class="reco__meta">${folioStr}</div>${chipsHtml}<h3>🎯 Recomendaciones para ti</h3><p class="reco__hint">Toca una bebida para ver descripción</p><div class="reco__list">`;
      recomendaciones.forEach((b) => {
        const name = String(b.nombre || "");
        if (name.startsWith("✨")) {
          salida += `<div class="reco__item reco__item--note">${name}</div>`;
        } else {
          salida += `<button class="reco__item" type="button" data-reco-item>${name}</button>`;
        }
      });
      salida += "</div>";

      if (efecto !== "ninguno") {
        const tinturas = {
          relajante: "Calming",
          energizante: "Focus",
          despegue: "Consulta a tu capitán de viaje",
        };
        salida += `<p>✨ Agrega una dosis de nuestra tintura <strong>${tinturas[efecto]}</strong> para potenciar tu experiencia.</p>`;
      }
      resultEl.innerHTML = salida;

      const share = document.createElement("div");
      share.className = "reco__actions";
      const btnShare = document.createElement("button");
      btnShare.className = "btn btn--ghost btn--sm";
      btnShare.type = "button";
      btnShare.textContent = "Compartir";
      btnShare.addEventListener("click", async () => {
        const recNames = recomendaciones.map((r) => r.nombre).join(", ");
        const title = "Recomendaciones Better Mood";
        const shareUrl = new URL(location.href);
        shareUrl.searchParams.set("cid", consultaId);
        const text = `Folio ${consultaSeq} (${consultaId}) — Recomendaciones: ${recNames} — Preferencias: ${chipValues.join(
          " · ",
        )}`;
        try {
          const pdfBlob = generarPDFRecomendaciones({
            title,
            consultaId,
            chips: chipValues.join(" · "),
            recomendaciones: recomendaciones.map((r) => r.nombre),
          });
          let file;
          try {
            file = new File([pdfBlob], `recomendaciones_${consultaId}.pdf`, { type: "application/pdf" });
          } catch (_) {
            file = pdfBlob;
          }
          let canShareFiles = false;
          try {
            canShareFiles =
              !!(navigator.canShare && typeof File !== "undefined" && file instanceof File && navigator.canShare({ files: [file] }));
          } catch (_) {
            canShareFiles = false;
          }
          if (canShareFiles) {
            await navigator.share({
              files: [file],
              title: `${title} · ${consultaId}`,
              text,
              url: shareUrl.toString(),
            });
            return;
          }
          const a = document.createElement("a");
          const blobForDl = file instanceof Blob ? file : pdfBlob;
          a.href = URL.createObjectURL(blobForDl);
          a.download = `recomendaciones_${consultaId}.pdf`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
          }, 1000);
        } catch (_) {
          try {
            if (navigator.share) await navigator.share({ text, url: shareUrl.toString() });
          } catch (__) {
            // ignore
          }
        }
      });
      share.appendChild(btnShare);
      resultEl.appendChild(share);

      resultEl.querySelectorAll("[data-reco-item]").forEach((el) => {
        const name = el.textContent.trim();
        el.setAttribute("aria-label", `Ver descripción de ${name}`);
        el.addEventListener("click", () => openDescripcion(name));
      });

      scrollToResultado();
    } else {
      resultEl.innerHTML = "<p>No encontramos la bebida perfecta, pero seguro tenemos algo que te encantará si preguntas en barra 😊</p>";
      scrollToResultado();
    }

    const payload = {
      timestamp: new Date().toISOString(),
      consulta_seq: String(consultaSeq),
      consulta_id: consultaId,
      tipo: tipo || "",
      cafeina: cafeina ? "si" : "no",
      dulce: dulce ? "si" : "no",
      efecto: efecto || "",
      recomendaciones: recomendaciones.map((r) => (r && r.nombre ? r.nombre : "")).join(", "),
    };
    submitConsultaLog(payload);
    trackRecommendation({
      consulta_id: consultaId,
      consulta_seq: consultaSeq,
      tipo: tipo || "",
      cafeina: cafeina ? "si" : "no",
      dulce: dulce ? "si" : "no",
      efecto: efecto || "",
      rec_count: recomendaciones.length,
    });
  };

  const resetRecomendador = () => {
    recomendadorRoot.querySelectorAll(".reco__option.is-selected").forEach((option) => {
      option.classList.remove("is-selected");
      option.setAttribute("aria-pressed", "false");
    });
    if (resultEl) resultEl.innerHTML = "";
    updateCTA();
  };

  const markInteraction = () => {
    hasInteracted = true;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (hasInteracted) resetRecomendador();
    }, RESET_MS);
  };

  recomendadorRoot.querySelectorAll(".reco__group").forEach((group) => {
    group.addEventListener("click", (event) => {
      const option = event.target.closest(".reco__option");
      if (!option || !group.contains(option)) return;
      const wasSelected = option.classList.contains("is-selected");
      group.querySelectorAll(".reco__option").forEach((opt) => {
        opt.classList.remove("is-selected");
        opt.setAttribute("aria-pressed", "false");
      });
      if (!wasSelected) {
        option.classList.add("is-selected");
        option.setAttribute("aria-pressed", "true");
      }
      updateCTA();
      markInteraction();
    });
  });

  if (ctaBtn) {
    ctaBtn.addEventListener("click", () => {
      markInteraction();
      recomendar();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      markInteraction();
      resetRecomendador();
    });
  }

  const applyQueryParams = () => {
    try {
      const params = new URLSearchParams(location.search);
      ["tipo", "cafeina", "dulce", "efecto"].forEach((name) => {
        const value = params.get(name);
        if (!value) return;
        const group = recomendadorRoot.querySelector(`.reco__group[data-name="${name}"]`);
        if (!group) return;
        const option = group.querySelector(`.reco__option[data-value="${value}"]`);
        if (!option) return;
        group.querySelectorAll(".reco__option").forEach((opt) => {
          opt.classList.remove("is-selected");
          opt.setAttribute("aria-pressed", "false");
        });
        option.classList.add("is-selected");
        option.setAttribute("aria-pressed", "true");
      });
      updateCTA();
    } catch (_) {
      // ignore
    }
  };

  applyQueryParams();
  updateCTA();
}

const rewardsPortalRoot = document.querySelector("[data-rewards-portal]");

if (rewardsPortalRoot) {
  const portalForm = rewardsPortalRoot.querySelector("[data-portal-form]");
  const portalStatus = rewardsPortalRoot.querySelector("[data-portal-status]");
  const portalSubmit = rewardsPortalRoot.querySelector("[data-portal-submit]");
  const portalReset = rewardsPortalRoot.querySelector("[data-portal-reset]");
  const portalResults = rewardsPortalRoot.querySelector("[data-portal-results]");
  const portalWallet = rewardsPortalRoot.querySelector("[data-portal-wallet]");
  const portalWalletLinks = rewardsPortalRoot.querySelector("[data-portal-wallet-links]");
  const portalMovements = rewardsPortalRoot.querySelector("[data-portal-movements]");
  const portalFields = {
    name: rewardsPortalRoot.querySelector("[data-portal-name]"),
    phone: rewardsPortalRoot.querySelector("[data-portal-phone]"),
    level: rewardsPortalRoot.querySelector("[data-portal-level]"),
    balance: rewardsPortalRoot.querySelector("[data-portal-balance]"),
    pending: rewardsPortalRoot.querySelector("[data-portal-pending]"),
    monthSpend: rewardsPortalRoot.querySelector("[data-portal-month-spend]"),
    monthEarned: rewardsPortalRoot.querySelector("[data-portal-month-earned]"),
    nextAmount: rewardsPortalRoot.querySelector("[data-portal-next-amount]"),
    nextLabel: rewardsPortalRoot.querySelector("[data-portal-next-label]"),
    expiry: rewardsPortalRoot.querySelector("[data-portal-expiry]"),
    session: rewardsPortalRoot.querySelector("[data-portal-session]"),
  };
  const PORTAL_STORAGE_KEY = "bmood_rewards_portal_token";
  let currentPortalToken = "";

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
  };

  const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const setPortalStatus = (message, tone = "neutral") => {
    if (!portalStatus) return;
    portalStatus.textContent = message;
    portalStatus.style.color =
      tone === "error" ? "#a6322c" : tone === "success" ? "#2f6b3a" : "rgba(35, 31, 32, 0.72)";
  };

  const clearPortalSession = () => {
    window.localStorage.removeItem(PORTAL_STORAGE_KEY);
    portalResults?.setAttribute("hidden", "hidden");
    portalReset?.setAttribute("hidden", "hidden");
    portalWallet?.setAttribute("hidden", "hidden");
    if (portalMovements) portalMovements.innerHTML = "";
  };

  const renderMovements = (movements = []) => {
    if (!portalMovements) return;
    if (!Array.isArray(movements) || !movements.length) {
      portalMovements.innerHTML = '<p class="rewards-portal__movement-empty">Todavía no hay movimientos recientes.</p>';
      return;
    }
    portalMovements.innerHTML = movements
      .map((movement) => {
        const amount = formatMoney(movement.amount);
        const note = movement.notes ? `<p class="rewards-portal__movement-note">${escapeHtml(movement.notes)}</p>` : "";
        const when = formatDateTime(movement.at);
        const expiry = movement.expiresAt ? ` • vence ${formatDateTime(movement.expiresAt)}` : "";
        return `
          <article class="rewards-portal__movement">
            <div class="rewards-portal__movement-main">
              <div>
                <strong>${escapeHtml(movement.label)}</strong>
                <span>${escapeHtml(movement.status || "")}</span>
              </div>
              <div class="rewards-portal__movement-amount">${amount}</div>
            </div>
            <time datetime="${movement.at || ""}">${when}${expiry}</time>
            ${note}
          </article>
        `;
      })
      .join("");
  };

  const walletPassUrl = (passes = [], platform) => {
    const target = String(platform || "").toLowerCase();
    return (Array.isArray(passes) ? passes : []).find((pass) => String(pass.platform || "").toLowerCase() === target && pass.installUrl)?.installUrl || "";
  };

  const walletBadgeMarkup = (platform, url = "") => {
    const isApple = platform === "apple";
    const label = isApple ? "Apple Wallet" : "Google Wallet";
    const iconClass = isApple ? "wallet-badge__icon--apple" : "wallet-badge__icon--google";
    return `
      <button class="wallet-badge wallet-badge--${platform}" type="button" data-wallet-platform="${platform}" data-wallet-url="${escapeHtml(url)}" aria-label="Agregar a ${label}">
        <span class="wallet-badge__icon ${iconClass}" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="wallet-badge__text"><small>Add to</small><strong>${label}</strong></span>
      </button>
    `;
  };

  const renderWalletLinks = (passes = []) => {
    if (!portalWallet || !portalWalletLinks) return;
    const appleUrl = walletPassUrl(passes, "apple");
    const googleUrl = walletPassUrl(passes, "google");
    portalWalletLinks.innerHTML = `${walletBadgeMarkup("apple", appleUrl)}${walletBadgeMarkup("google", googleUrl)}`;
    portalWallet.removeAttribute("hidden");
  };

  const issueWalletPass = async (platform) => {
    if (!currentPortalToken) {
      setPortalStatus("Primero consulta tu saldo.", "error");
      return;
    }
    const target = platform === "apple" ? "apple" : "google";
    const button = portalWalletLinks?.querySelector(`[data-wallet-platform="${target}"]`);
    if (button) button.setAttribute("disabled", "disabled");
    setPortalStatus(target === "apple" ? "Preparando Apple Wallet..." : "Preparando Google Wallet...");
    try {
      const res = await fetch(`${API_BASE}/recompensas-consulta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: target === "apple" ? "issue_apple_wallet" : "issue_google_wallet", token: currentPortalToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data.error || "No se pudo generar tu tarjeta digital.");
      if (data.customer) renderPortalCustomer(data, currentPortalToken, { skipScroll: true });
      const installUrl = data.installUrl || walletPassUrl(data.customer?.wallet?.passes || [], target);
      if (!installUrl) throw new Error("No se recibió el enlace de Wallet.");
      setPortalStatus("Tarjeta lista. Abriendo Wallet...", "success");
      window.location.href = installUrl;
    } catch (error) {
      setPortalStatus(error.message || "No se pudo generar tu tarjeta digital.", "error");
    } finally {
      if (button) button.removeAttribute("disabled");
    }
  };

  const renderPortalCustomer = (payload, token, options = {}) => {
    const customer = payload?.customer;
    if (!customer) return;
    const profile = customer.profile || {};
    const publicCustomer = customer.customer || {};
    const sessionExpiresAt = payload.sessionExpiresAt ? formatDateTime(payload.sessionExpiresAt) : "";

    if (portalFields.name) portalFields.name.textContent = publicCustomer.name || "Cliente Better Mood";
    if (portalFields.phone) portalFields.phone.textContent = publicCustomer.phoneMasked || "";
    if (portalFields.level) {
      const levelName = profile.cashbackLevelLabel || "Bronce";
      const pct = profile.cashbackPct ? `${Number(profile.cashbackPct).toFixed(2)}% cashback` : "";
      portalFields.level.textContent = pct ? `${levelName} · ${pct}` : levelName;
    }
    if (portalFields.balance) portalFields.balance.textContent = formatMoney(profile.availableCashbackBalance);
    if (portalFields.pending) portalFields.pending.textContent = formatMoney(profile.pendingCashbackBalance);
    if (portalFields.monthSpend) portalFields.monthSpend.textContent = formatMoney(profile.currentMonthEligibleSpend);
    if (portalFields.monthEarned) portalFields.monthEarned.textContent = formatMoney(profile.currentMonthCashbackEarned);
    if (portalFields.nextAmount) portalFields.nextAmount.textContent = formatMoney(profile.amountToNextTier);
    if (portalFields.nextLabel) {
      portalFields.nextLabel.textContent = profile.nextTierLabel
        ? `Te faltan ${formatMoney(profile.amountToNextTier)} para ${profile.nextTierLabel}.`
        : "Ya estás en el nivel más alto.";
    }
    if (portalFields.expiry) {
      portalFields.expiry.textContent = customer.promo?.nearestExpiry
        ? `Próximo vencimiento: ${formatDateTime(customer.promo.nearestExpiry)}`
        : "Sin vencimientos cercanos.";
    }
    if (portalFields.session) {
      portalFields.session.textContent = sessionExpiresAt
        ? `Consulta activa hasta ${sessionExpiresAt}.`
        : "";
    }

    renderWalletLinks(customer.wallet?.passes || []);
    renderMovements(customer.movements || []);
    portalResults?.removeAttribute("hidden");
    portalReset?.removeAttribute("hidden");
    if (token) {
      currentPortalToken = token;
      window.localStorage.setItem(PORTAL_STORAGE_KEY, token);
    }
    if (!options.skipScroll) {
      window.requestAnimationFrame(() => portalResults?.scrollIntoView({ block: "start", behavior: "auto" }));
    }
  };

  const loadPortalSession = async (token, options = {}) => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/recompensas-consulta?token=${encodeURIComponent(token)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data.error || "No se pudo abrir tu consulta.");
      }
      renderPortalCustomer(data, token);
      if (!options.silent) setPortalStatus("Saldo cargado correctamente.", "success");
      return true;
    } catch (error) {
      clearPortalSession();
      currentPortalToken = "";
      if (!options.silent) setPortalStatus(error.message || "No se pudo abrir tu consulta.", "error");
      return false;
    }
  };

  portalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(portalForm);
    const payload = {
      phone: String(formData.get("phone") || "").trim(),
      birthdayDay: String(formData.get("birthdayDay") || "").trim(),
      birthdayMonth: String(formData.get("birthdayMonth") || "").trim(),
    };

    if (!payload.phone || !payload.birthdayDay || !payload.birthdayMonth) {
      setPortalStatus("Captura teléfono, día y mes.", "error");
      return;
    }

    setPortalStatus("Consultando saldo...");
    if (portalSubmit) portalSubmit.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/recompensas-consulta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.token) {
        throw new Error(data.error || "No pudimos validar tus datos.");
      }
      renderPortalCustomer(data, data.token);
      setPortalStatus("Consulta lista.", "success");
    } catch (error) {
      clearPortalSession();
      setPortalStatus(error.message || "No pudimos validar tus datos.", "error");
    } finally {
      if (portalSubmit) portalSubmit.disabled = false;
    }
  });

  portalReset?.addEventListener("click", () => {
    portalForm?.reset();
    currentPortalToken = "";
    clearPortalSession();
    setPortalStatus("Consulta cerrada. Puedes volver a ingresar tus datos cuando quieras.");
  });

  portalWalletLinks?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-wallet-platform]");
    if (!button) return;
    event.preventDefault();
    issueWalletPass(button.getAttribute("data-wallet-platform"));
  });

  const existingPortalToken = window.localStorage.getItem(PORTAL_STORAGE_KEY);
  if (existingPortalToken) {
    loadPortalSession(existingPortalToken, { silent: true }).then((ok) => {
      if (ok) setPortalStatus("Recuperamos tu consulta activa.", "success");
    });
  }
}
