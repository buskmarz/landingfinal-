import fs from "node:fs/promises";
import path from "node:path";
import { LocalSeoPage } from "./local-seo-components.mjs";
import { localPagesData } from "./local-pages-data.mjs";

const rootDir = process.cwd();

const staticSitemapEntries = [
  "https://bmoodcoffee.com/",
  "https://bmoodcoffee.com/recompensas/",
  "https://bmoodcoffee.com/eventos/",
  "https://bmoodcoffee.com/bienestar/",
  "https://bmoodcoffee.com/arcade/",
  "https://bmoodcoffee.com/recomendador/",
  "https://bmoodcoffee.com/calendario-futbolero/",
  "https://bmoodcoffee.com/origen-cafe/",
  "https://bmoodcoffee.com/recorrido-cafe/",
  "https://bmoodcoffee.com/cafe-de-especialidad-puebla/",
  "https://bmoodcoffee.com/cbd-en-el-cafe/",
  "https://bmoodcoffee.com/como-preparar-cafe-en-casa/",
  "https://bmoodcoffee.com/talleres-de-cafe-puebla/"
];

async function writeLocalPages() {
  for (const page of localPagesData) {
    const directory = path.join(rootDir, page.slug);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "index.html"), `${LocalSeoPage({
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
  const urls = [...staticSitemapEntries, ...localPagesData.map((page) => `https://bmoodcoffee.com/${page.slug}/`)];
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

console.log(`Rendered ${localPagesData.length} local SEO pages and refreshed sitemap.xml`);
