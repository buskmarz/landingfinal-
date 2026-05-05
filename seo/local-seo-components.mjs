import { business, footerLocalGuides, findPageByHref } from "./local-pages-data.mjs";

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraphs(items = []) {
  return items.map((item) => `<p>${item}</p>`).join("\n");
}

export function JsonLd(entries) {
  return entries
    .map(
      (entry) =>
        `<script type="application/ld+json">\n${JSON.stringify(entry, null, 2)}\n</script>`
    )
    .join("\n");
}

export function Breadcrumbs(items) {
  const links = items
    .map((item, index) => {
      if (index === items.length - 1) {
        return `<span aria-current="page">${escapeHtml(item.label)}</span>`;
      }
      return `<a href="${item.href}">${escapeHtml(item.label)}</a><span>/</span>`;
    })
    .join("");
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${links}</nav>`;
}

export function LocalHero(page) {
  return `
      <section class="page-hero page-hero--content" aria-labelledby="content-title">
        <div class="container page-hero__grid">
          <div class="page-hero__content">
            ${Breadcrumbs([
              { href: "/", label: "Inicio" },
              { href: `/${page.slug}/`, label: page.shortTitle }
            ])}
            <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
            <h1 id="content-title">${escapeHtml(page.h1)}</h1>
            <p class="hero__text">${page.heroText}</p>
            <div class="hero__actions">
              <a class="btn btn--primary" href="${business.menuUrl}" target="_blank" rel="noopener">Ver menú</a>
              <a class="btn btn--secondary" href="/#quick-order">Pedir ahora</a>
            </div>
          </div>

          <div class="content-hero__media">
            <img
              src="..${page.image}"
              alt="${escapeHtml(page.imageAlt)}"
              loading="eager"
              decoding="async"
              width="960"
              height="1080"
            />
          </div>
        </div>
      </section>`;
}

export function LocalBenefits(page) {
  return `
    <div class="article-card local-benefits">
      <p class="article-card__eyebrow">Lo más útil</p>
      <h2>${escapeHtml(page.keyword)}</h2>
      <ul class="local-benefits__list">
        ${page.benefits.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>`;
}

function renderLocationCard() {
  return `
    <div class="article-card local-location">
      <p class="article-card__eyebrow">Visítanos</p>
      <h2>${escapeHtml(business.addressLine)}</h2>
      <div class="local-location__hours">
        ${business.hours
          .map(
            (row) =>
              `<div class="local-location__row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`
          )
          .join("")}
      </div>
      <div class="location__amenities" aria-label="Amenidades">
        ${business.amenities.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="article-card__actions">
        <a class="btn btn--primary btn--sm" href="${business.mapsUrl}" target="_blank" rel="noopener">Maps</a>
        <a class="btn btn--secondary btn--sm" href="${business.wazeUrl}" target="_blank" rel="noopener">Waze</a>
      </div>
    </div>`;
}

function renderRelatedLinks(page) {
  return `
    <div class="article-card article-card--links">
      <p class="article-card__eyebrow">Explora Better Mood</p>
      ${page.related
        .map((href) => {
          const item = findPageByHref(href);
          const label = item?.label ?? item?.shortTitle ?? href;
          return `<a href="${href}">${escapeHtml(label)}</a>`;
        })
        .join("")}
    </div>`;
}

export function RecommendedDrinks(page) {
  return `
    <section class="local-section" aria-labelledby="recommended-title">
      <h2 id="recommended-title">${escapeHtml(page.recommendationsTitle)}</h2>
      <div class="recommended-grid">
        ${page.recommendations
          .map(
            (item) => `
              <article class="article-card recommended-card">
                <p class="article-card__eyebrow">${escapeHtml(item.meta)}</p>
                <h3>${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.description)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>`;
}

export function LocalFaq(page) {
  return `
    <section class="local-section" aria-labelledby="faq-title">
      <h2 id="faq-title">Preguntas frecuentes</h2>
      <div class="faq">
        <div class="faq__items">
          ${page.faqs
            .map(
              (faq) => `
                <details class="faq__item">
                  <summary>${escapeHtml(faq.question)}</summary>
                  <p>${escapeHtml(faq.answer)}</p>
                </details>
              `
            )
            .join("")}
        </div>
      </div>
    </section>`;
}

export function LocalCta(page) {
  return `
      <section class="section section--cta section--cta-tight">
        <div class="container">
          <div class="section__header">
            <p class="eyebrow">Siguiente paso</p>
            <h2>${escapeHtml(page.cta.title)}</h2>
            <p>${escapeHtml(page.cta.text)}</p>
          </div>
          <div class="section__cta local-cta__actions">
            <a class="btn btn--primary" href="${business.mapsUrl}" target="_blank" rel="noopener">Maps</a>
            <a class="btn btn--secondary" href="${business.whatsappUrl}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a class="btn btn--secondary" href="${business.uberEatsUrl}" target="_blank" rel="noopener noreferrer">Uber Eats</a>
            <a class="btn btn--secondary" href="${business.rappiUrl}" target="_blank" rel="noopener noreferrer">Rappi</a>
          </div>
        </div>
      </section>`;
}

function pageSchemas(page) {
  const canonical = `${business.siteUrl}/${page.slug}/`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "CafeOrCoffeeShop",
      name: business.name,
      url: business.siteUrl,
      image: `${business.siteUrl}/assets/hero-coffee.jpg`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "13 Poniente 2302/F, Col. La Paz",
        addressLocality: "Puebla",
        addressRegion: "Puebla",
        addressCountry: "MX"
      },
      hasMap: business.mapsUrl,
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "08:00",
          closes: "21:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Saturday",
          opens: "09:00",
          closes: "20:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Sunday",
          opens: "10:00",
          closes: "18:00"
        }
      ],
      sameAs: [business.instagramUrl, business.facebookUrl],
      potentialAction: [
        {
          "@type": "ReserveAction",
          target: business.whatsappUrl,
          name: "Escribir por WhatsApp"
        },
        {
          "@type": "OrderAction",
          target: [business.uberEatsUrl, business.rappiUrl],
          name: "Pedir Better Mood Coffee"
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      url: canonical,
      description: page.description,
      isPartOf: business.siteUrl
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: `${business.siteUrl}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.shortTitle,
          item: canonical
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer
        }
      }))
    }
  ];
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="container footer__grid">
        <div class="footer__brand">
          <img class="footer__logo" src="../assets/logo-better-mood.png" alt="Better Mood Coffee" />
          <p>Better Mood Coffee — Café de especialidad y bienestar responsable en Puebla.</p>
        </div>
        <div class="footer__links">
          <h3>Navegación</h3>
          <a href="/#menu">Menú</a>
          <a href="/recompensas/">Recompensas</a>
          <a href="/bienestar/">Bienestar</a>
          <a href="/eventos/">Eventos</a>
          <a href="/arcade/">Arcade</a>
          <a href="/recomendador/">Recomendador</a>
          <a href="/aviso-privacidad.html">Aviso de privacidad</a>
        </div>
        <div class="footer__links">
          <h3>Educación cafetera</h3>
          <a href="/origen-cafe/">Origen del café</a>
          <a href="/recorrido-cafe/">Recorrido del café</a>
          <a href="/como-preparar-cafe-en-casa/">Preparar café en casa</a>
          <a href="/talleres-de-cafe-puebla/">Talleres de café Puebla</a>
        </div>
        <div class="footer__links footer__links--guides">
          <h3>Guías locales</h3>
          ${footerLocalGuides.map((guide) => `<a href="${guide.href}">${escapeHtml(guide.label)}</a>`).join("")}
        </div>
        <div class="footer__links">
          <h3>Ubicación</h3>
          <p>${escapeHtml(business.addressLine)}</p>
          <a href="${business.mapsUrl}" target="_blank" rel="noopener">Maps</a>
          <a href="${business.wazeUrl}" target="_blank" rel="noopener">Waze</a>
          <a href="${business.whatsappUrl}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </div>
      <div class="container footer__disclaimer">
        <p>
          Uso responsable de CBD: producto derivado de cáñamo, no psicoactivo. No recomendado para menores de edad, embarazo o lactancia. Si tomas medicamentos, consulta a tu médico.
        </p>
        <p class="footer__copyright">© Better Mood Coffee. Todos los derechos reservados.</p>
      </div>
    </footer>

    <a
      class="floating-whatsapp"
      href="${business.whatsappUrl}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
    >
      WhatsApp
    </a>

    <script src="../script.js"></script>`;
}

export function LocalSeoPage(page) {
  const canonical = `${business.siteUrl}/${page.slug}/`;
  const bodyContent = page.sections
    .map(
      (section) => `
        <section class="local-section">
          <h2>${escapeHtml(section.heading)}</h2>
          ${paragraphs(section.paragraphs)}
        </section>
      `
    )
    .join("\n");

  return `<!doctype html>
<html lang="es-MX">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}" />
    <meta name="robots" content="index,follow" />
    <meta name="keywords" content="${escapeHtml(page.keywords)}" />
    <link rel="canonical" href="${canonical}" />

    <meta property="og:locale" content="es_MX" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(business.name)}" />
    <meta property="og:title" content="${escapeHtml(page.title)}" />
    <meta property="og:description" content="${escapeHtml(page.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${business.siteUrl}${page.image}" />
    <meta property="og:image:alt" content="${escapeHtml(page.imageAlt)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(page.title)}" />
    <meta name="twitter:description" content="${escapeHtml(page.description)}" />
    <meta name="twitter:url" content="${canonical}" />
    <meta name="twitter:image" content="${business.siteUrl}${page.image}" />

    ${JsonLd(pageSchemas(page))}

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../styles.css" />
    <link rel="icon" href="../assets/logo-better-mood.png" />
  </head>
  <body class="local-guide-page">
    <a class="skip-link" href="#main">Saltar al contenido</a>

    <header class="header" id="top">
      <div class="container header__inner">
        <a class="logo" href="/" aria-label="${escapeHtml(business.name)}">
          <img src="../assets/logo-better-mood.png" alt="${escapeHtml(business.name)}" />
        </a>

        <button class="nav-toggle" aria-controls="primary-nav" aria-expanded="false">
          <span class="nav-toggle__icon" aria-hidden="true"></span>
          <span class="nav-toggle__label" aria-hidden="true">Menú</span>
          <span class="sr-only">Abrir navegación</span>
        </button>

        <nav class="nav" id="primary-nav">
          <a href="/#menu">Menú</a>
          <a href="/recompensas/">Recompensas</a>
          <a href="/bienestar/">Bienestar</a>
          <a href="/#location">Ubicación</a>
          <a class="btn btn--sm btn--primary" href="/#quick-order">Pedir ahora</a>
        </nav>
      </div>
    </header>

    <main id="main">
      ${LocalHero(page)}

      <section class="section section--compact">
        <div class="container article-shell">
          <article class="article-content">
            ${bodyContent}
            ${RecommendedDrinks(page)}
            ${LocalFaq(page)}
          </article>

          <aside class="article-sidebar">
            ${LocalBenefits(page)}
            ${renderLocationCard()}
            ${renderRelatedLinks(page)}
          </aside>
        </div>
      </section>

      ${LocalCta(page)}
    </main>

    ${renderFooter()}
  </body>
</html>`;
}
