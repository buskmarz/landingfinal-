(() => {
  const finderRoot = document.querySelector(".finder-widget");
  if (!finderRoot) return;

  const menu = [
    // Latte especial (con sabores)
    {
      nombre: "Latte lavanda",
      disponible_en: ["caliente", "fría"],
      dulce: true,
      cafeina: true,
      efecto: ["energizante", "despegue"],
    },
    {
      nombre: "Latte caramelo",
      disponible_en: ["caliente", "fría"],
      dulce: true,
      cafeina: true,
      efecto: ["energizante", "despegue"],
    },
    {
      nombre: "Latte vainilla",
      disponible_en: ["caliente", "fría"],
      dulce: true,
      cafeina: true,
      efecto: ["energizante", "despegue"],
    },
    {
      nombre: "Latte horchata",
      disponible_en: ["caliente", "fría"],
      dulce: true,
      cafeina: true,
      efecto: ["energizante", "despegue"],
    },
    {
      nombre: "Latte pistache",
      disponible_en: ["caliente", "fría"],
      dulce: true,
      cafeina: true,
      efecto: ["energizante", "despegue"],
    },
    {
      nombre: "Latte pumpkin",
      disponible_en: ["caliente", "fría"],
      dulce: true,
      cafeina: true,
      efecto: ["energizante", "despegue"],
    },

    // Sodas italianas
    {
      nombre: "Soda lavanda",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },
    {
      nombre: "Soda fresa",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },
    {
      nombre: "Soda durazno",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },
    {
      nombre: "Soda mango",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },
    {
      nombre: "Soda manzana",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },
    {
      nombre: "Soda manzana verde",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },
    {
      nombre: "Soda maracuyá",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },
    {
      nombre: "Soda mixed berries",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },
    {
      nombre: "Soda coco",
      disponible_en: ["fría"],
      dulce: true,
      cafeina: false,
      efecto: "neutro",
    },

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

  function scrollToResultado() {
    const r = finderRoot.querySelector("#resultado");
    if (!r) return;
    try {
      r.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      try {
        r.scrollIntoView(true);
      } catch (_) {
        const y = r.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);
        window.scrollTo(0, y);
      }
    }
    r.style.boxShadow = "0 0 0 3px #ffde00";
    setTimeout(() => {
      r.style.boxShadow = "";
    }, 800);
  }

  function getSelected(name) {
    const el = finderRoot.querySelector(`[data-name="${name}"] .selected`);
    return el ? el.getAttribute("data-value") : null;
  }

  function updateCTA() {
    const requiredGroups = finderRoot.querySelectorAll('.button-group[data-required="true"]');
    let complete = true;
    requiredGroups.forEach((g) => {
      if (!g.querySelector(".option.selected")) complete = false;
    });
    const btn = finderRoot.querySelector("#ctaRecomendar");
    if (btn) btn.disabled = !complete;
  }

  // Descripciones basadas en la carta
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
    "YAKOOLD BREW": "Cold brew con un toque de Yakult; refrescante y único. 360 ml.",
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

  function descripcionGenerica(nombre) {
    if (/^Latte\s/i.test(nombre)) {
      const sabor = nombre.replace(/^Latte\s/i, "");
      return `Espresso con leche y jarabe de ${sabor.toLowerCase()}.`;
    }
    if (/^Smoothie/i.test(nombre)) return "Smoothie frutal 430 ml.";
    if (/^Soda/i.test(nombre)) return "Soda italiana con agua mineral.";
    return "Consulta en barra los detalles y variaciones.";
  }

  function getDescripcionByName(nombre) {
    if (DESCRIPCIONES[nombre]) return DESCRIPCIONES[nombre];
    return descripcionGenerica(nombre);
  }

  function openDescripcion(nombre) {
    const modal = finderRoot.querySelector("#descModal");
    if (!modal) return;
    const title = finderRoot.querySelector("#descTitle");
    const text = finderRoot.querySelector("#descText");
    if (title) title.textContent = nombre;
    if (text) text.textContent = getDescripcionByName(nombre);
    modal.classList.add("show");

    const close = modal.querySelector(".modal-close");
    const off = () => {
      modal.classList.remove("show");
      cleanup();
    };
    const esc = (e) => {
      if (e.key === "Escape") off();
    };
    function cleanup() {
      modal.removeEventListener("click", bg);
      document.removeEventListener("keydown", esc);
    }
    function bg(e) {
      if (e.target === modal) off();
    }

    modal.addEventListener("click", bg);
    document.addEventListener("keydown", esc);
    if (close) close.onclick = off;
  }

  function nextConsultaSeq() {
    try {
      const key = "bm_consulta_seq";
      const n = parseInt(localStorage.getItem(key) || "0", 10) + 1;
      localStorage.setItem(key, String(n));
      return n;
    } catch (e) {
      return Math.floor(Date.now() / 1000);
    }
  }

  function shortId() {
    try {
      if (crypto && crypto.randomUUID) {
        return crypto.randomUUID().split("-")[0].toUpperCase();
      }
    } catch (_) {}
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase();
  }

  function encodeBody(data) {
    return Object.keys(data)
      .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&");
  }

  function isNetlifyHost() {
    try {
      const h = ((location && location.hostname) || "").toLowerCase();
      if (!h) return false;
      if (h === "localhost" || h === "127.0.0.1") return false;
      return /\.netlify\.(app|com)$/.test(h);
    } catch (_) {
      return false;
    }
  }

  function submitConsultaLog(payload) {
    if (!isNetlifyHost()) return;
    const body = encodeBody(Object.assign({ "form-name": "consultas" }, payload));
    try {
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }).catch(() => {});
    } catch (e) {
      /* offline/local */
    }
  }

  function trackRecommendation(ev) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: "recommendation" }, ev));
    } catch (_) {}
  }

  // Generar PDF simple sin dependencias externas
  function generarPDFRecomendaciones({ title, consultaId, chips, recomendaciones }) {
    const width = 595;
    const height = 842;
    const margin = 48;
    const lines = [];
    function esc(str) {
      return String(str).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    }
    lines.push(`BT /F1 18 Tf 50 780 Td (${esc(title)}) Tj ET`);
    lines.push(`BT /F1 11 Tf 50 760 Td (Consulta: ${esc(consultaId)}) Tj ET`);
    lines.push(`BT /F1 11 Tf 50 742 Td (Preferencias: ${esc(chips)}) Tj ET`);
    let y = 720;
    lines.push(`BT /F1 13 Tf 50 ${y} Td (Bebidas recomendadas) Tj ET`);
    y -= 18;
    recomendaciones.forEach((name, i) => {
      y -= 16;
      if (y < margin) y = margin;
      lines.push(`BT /F1 11 Tf 60 ${y} Td (${esc(String(i + 1) + ". " + name)}) Tj ET`);
    });

    const contentStream = lines.join("\n");
    const contentLen = new TextEncoder().encode(contentStream).length;
    const chunks = [];
    let offset = 0;
    const xref = [];
    function pushStr(s) {
      const b = new TextEncoder().encode(s);
      chunks.push(b);
      offset += b.length;
    }
    function addObj(id, body) {
      xref[id] = offset;
      pushStr(`${id} 0 obj\n${body}\nendobj\n`);
    }
    pushStr("%PDF-1.4\n");
    pushStr("%\xFF\xFF\xFF\xFF\n");
    addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObj(
      3,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>`
    );
    addObj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    addObj(5, `<< /Length ${contentLen} >>\nstream\n${contentStream}\nendstream`);

    const xrefStart = offset;
    let xrefTable = "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i++) {
      xrefTable += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    pushStr(xrefTable + trailer);
    return new Blob(chunks, { type: "application/pdf" });
  }

  let idle;
  const RESET_MS = 60000;
  function scheduleReset() {
    clearTimeout(idle);
    idle = setTimeout(() => {
      finderRoot.querySelectorAll(".button-group .option.selected").forEach((o) => {
        o.classList.remove("selected");
        o.setAttribute("aria-pressed", "false");
      });
      const r = finderRoot.querySelector("#resultado");
      if (r) r.innerHTML = "";
      updateCTA();
    }, RESET_MS);
  }

  function recomendar() {
    const tipo = getSelected("tipo");
    const cafeinaVal = getSelected("cafeina");
    const dulceVal = getSelected("dulce");
    const efecto = getSelected("efecto") || "ninguno";
    const cafeina = cafeinaVal === "si";
    const dulce = dulceVal === "si";

    let recomendaciones = menu.filter(
      (b) =>
        tipo &&
        b.disponible_en.indexOf(tipo) !== -1 &&
        b.cafeina === cafeina &&
        b.dulce === dulce &&
        (efecto === "ninguno" || (Array.isArray(b.efecto) ? b.efecto.includes(efecto) : b.efecto === efecto))
    );

    if (recomendaciones.length === 0 && efecto !== "ninguno") {
      recomendaciones = menu.filter(
        (b) => tipo && b.disponible_en.indexOf(tipo) !== -1 && b.cafeina === cafeina && b.dulce === dulce
      );
      if (recomendaciones.length > 0) {
        recomendaciones.push({
          nombre:
            "✨ Puedes personalizar esta bebida con nuestro jarabe favorito y una dosis de tintura especial para sentirte como quieres.",
          disponible_en: [tipo],
          dulce: true,
          cafeina,
          efecto,
        });
      }
    }

    const resultado = finderRoot.querySelector("#resultado");
    if (!resultado) return;

    const consultaSeq = nextConsultaSeq();
    const consultaId = shortId();

    if (recomendaciones.length > 0) {
      const chips = [];
      if (tipo) chips.push(`<span class='pill'>${tipo}</span>`);
      chips.push(`<span class='pill'>${cafeina ? "con cafeína" : "sin cafeína"}</span>`);
      chips.push(`<span class='pill'>${dulce ? "dulce" : "no dulce"}</span>`);
      if (efecto && efecto !== "ninguno") chips.push(`<span class='pill'>${efecto}</span>`);

      const folioStr = `Recomendación #${consultaSeq} · ID ${consultaId}`;
      let salida = `<div class='hint'>${folioStr}</div>${chips.join(
        " "
      )}<h3>🎯 Recomendaciones para ti</h3><div class='hint'>Toca una bebida para ver descripción</div><div class='custom-list'>`;

      recomendaciones.forEach((b) => {
        salida += `<div class="custom-item">${b.nombre}</div>`;
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

      resultado.innerHTML = salida;

      const share = document.createElement("div");
      share.className = "actions";
      const btnShare = document.createElement("button");
      btnShare.className = "btn btn-link";
      btnShare.type = "button";
      btnShare.textContent = "Compartir";

      btnShare.addEventListener("click", async () => {
        const cleanChips = chips.map((c) => c.replace(/<[^>]+>/g, "")).join(" ");
        const recNames = recomendaciones.map((r) => r.nombre).join(", ");
        const title = "Recomendaciones Better Mood";
        const cid = consultaId;
        const seq = consultaSeq;
        const shareUrl = new URL(location.href);
        shareUrl.searchParams.set("cid", cid);
        const text = `Folio ${seq} (${cid}) — Recomendaciones: ${recNames} — Preferencias: ${cleanChips}`;

        try {
          const pdfBlob = generarPDFRecomendaciones({
            title,
            consultaId: cid,
            chips: cleanChips,
            recomendaciones: recomendaciones.map((r) => r.nombre),
          });
          let file;
          try {
            file = new File([pdfBlob], `recomendaciones_${cid}.pdf`, { type: "application/pdf" });
          } catch (_) {
            file = pdfBlob;
          }

          let canShareFiles = false;
          try {
            canShareFiles =
              !!navigator.canShare &&
              typeof File !== "undefined" &&
              file instanceof File &&
              navigator.canShare({ files: [file] });
          } catch (_) {
            canShareFiles = false;
          }

          if (canShareFiles) {
            await navigator.share({
              files: [file],
              title: `${title} · ${cid}`,
              text,
              url: shareUrl.toString(),
            });
            return;
          }

          const a = document.createElement("a");
          const blobForDl = file instanceof Blob ? file : pdfBlob;
          a.href = URL.createObjectURL(blobForDl);
          a.download = `recomendaciones_${cid}.pdf`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
          }, 1000);
        } catch (_) {
          try {
            if (navigator.share) await navigator.share({ text, url: shareUrl.toString() });
          } catch (__) {}
        }
      });

      share.appendChild(btnShare);
      resultado.appendChild(share);

      resultado.querySelectorAll(".custom-item").forEach((el) => {
        const name = el.textContent.trim();
        if (name.startsWith("✨")) return;
        el.classList.add("clickable");
        el.title = "Ver descripción";
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", `Ver descripción de ${name}`);
        el.addEventListener("click", () => openDescripcion(name));
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDescripcion(name);
          }
        });
      });

      scrollToResultado();
    } else {
      resultado.innerHTML =
        "<p>No encontramos la bebida perfecta, pero seguro tenemos algo que te encantará si preguntas en barra 😊</p>";
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
  }

  finderRoot.querySelectorAll(".button-group").forEach((group) => {
    group.addEventListener("click", (e) => {
      const target = e.target;
      if (!target || !target.classList.contains("option")) return;

      const wasSelected = target.classList.contains("selected");
      group.querySelectorAll(".option").forEach((opt) => {
        opt.classList.remove("selected");
        opt.setAttribute("aria-pressed", "false");
      });
      if (!wasSelected) {
        target.classList.add("selected");
        target.setAttribute("aria-pressed", "true");
      }
      updateCTA();
      scheduleReset();
    });

    group.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target && e.target.classList.contains("option")) {
        e.preventDefault();
        e.target.click();
      }
    });
  });

  // Mantener la pantalla despierta (Wake Lock)
  let wakeLock;
  async function keepAwake() {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (e) {}
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !wakeLock) keepAwake();
  });

  function applyQueryParams() {
    try {
      const p = new URLSearchParams(location.search);
      ["tipo", "cafeina", "dulce", "efecto"].forEach((name) => {
        const v = p.get(name);
        if (!v) return;
        const group = finderRoot.querySelector(`.button-group[data-name="${name}"]`);
        if (!group) return;
        const opt = group.querySelector(`.option[data-value="${v}"]`);
        if (!opt) return;
        group.querySelectorAll(".option").forEach((o) => {
          o.classList.remove("selected");
          o.setAttribute("aria-pressed", "false");
        });
        opt.classList.add("selected");
        opt.setAttribute("aria-pressed", "true");
      });
      updateCTA();
    } catch (_) {}
  }

  window.addEventListener("load", () => {
    keepAwake();
    updateCTA();
    applyQueryParams();
  });

  // Registrar Service Worker (PWA). Si no existe sw.js no rompe la app.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = "./sw.js?v=2";
      navigator.serviceWorker
        .register(swUrl, { updateViaCache: "none" })
        .then((reg) => {
          try {
            reg.update();
          } catch (_) {}
        })
        .catch(() => {});
    });
  }

  const btnReco = finderRoot.querySelector("#ctaRecomendar");
  if (btnReco) btnReco.addEventListener("click", recomendar);

  const btnReset = finderRoot.querySelector("#btnReset");
  if (btnReset)
    btnReset.addEventListener("click", () => {
      finderRoot.querySelectorAll(".button-group .option.selected").forEach((o) => {
        o.classList.remove("selected");
        o.setAttribute("aria-pressed", "false");
      });
      const r = finderRoot.querySelector("#resultado");
      if (r) r.innerHTML = "";
      updateCTA();
      scheduleReset();
    });

  ["click", "touchstart", "keydown"].forEach((evt) =>
    finderRoot.addEventListener(evt, scheduleReset, { passive: true })
  );
})();

