import fs from "node:fs/promises";
import path from "node:path";
import { LocalSeoPage } from "./local-seo-components.mjs";
import { localPagesData } from "./local-pages-data.mjs";

const rootDir = process.cwd();

const staticSitemapEntries = [
  "https://bmoodcoffee.com/",
  "https://bmoodcoffee.com/menu/",
  "https://bmoodcoffee.com/menu-cholula/",
  "https://bmoodcoffee.com/recompensas/",
  "https://bmoodcoffee.com/ruleta/",
  "https://bmoodcoffee.com/cholula/",
  "https://bmoodcoffee.com/eventos/",
  "https://bmoodcoffee.com/bienestar/",
  "https://bmoodcoffee.com/arcade/",
  "https://bmoodcoffee.com/recomendador/",
  "https://bmoodcoffee.com/calendario-futbolero/",
  "https://bmoodcoffee.com/cafe-lavado/",
  "https://bmoodcoffee.com/origen-cafe/",
  "https://bmoodcoffee.com/recorrido-cafe/",
  "https://bmoodcoffee.com/cafe-de-especialidad-puebla/",
  "https://bmoodcoffee.com/como-preparar-cafe-en-casa/",
  "https://bmoodcoffee.com/talleres-de-cafe-puebla/"
];

async function writeLocalPages() {
  for (const page of localPagesData) {
    const directory = path.join(rootDir, page.slug);
    const outputPath = path.join(directory, "index.html");
    await fs.mkdir(directory, { recursive: true });
    try {
      await fs.access(outputPath);
      continue;
    } catch {
      // Las páginas existentes se curan manualmente para conservar copy, SEO y cumplimiento.
    }
    const legacyRiskPattern = /CBD|HHC|Delta\s*9|Magic Mushroom|no psicoactivo/i;
    if (legacyRiskPattern.test(JSON.stringify(page))) {
      console.warn(`Skipped legacy page data pending compliance review: ${page.slug}`);
      continue;
    }
    await fs.writeFile(outputPath, `${LocalSeoPage({
      ...page,
      shortTitle: page.shortTitle ?? page.h1.replace(/\.$/, "")
    })}\n`);
  }
}

function getLocalMexicoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City"
  }).format(new Date());
}

async function writeSitemap() {
  const today = getLocalMexicoDate();
  const indexableLocalPages = localPagesData.filter((page) => page.slug !== "cbd-no-psicoactivo-puebla");
  const urls = [...new Set([...staticSitemapEntries, ...indexableLocalPages.map((page) => `https://bmoodcoffee.com/${page.slug}/`)])];
  const body = urls
    .map((url) => {
      const priority = url === "https://bmoodcoffee.com/" ? "1.0" : url.includes("/recompensas/") ? "0.9" : "0.8";
      return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  await fs.writeFile(path.join(rootDir, "sitemap.xml"), xml);
}

await writeLocalPages();
await writeSitemap();

console.log(`Preserved curated local SEO pages and refreshed sitemap.xml`);
