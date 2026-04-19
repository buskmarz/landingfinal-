import fs from "node:fs/promises";
import path from "node:path";
import { localPagesData } from "./local-pages-data.mjs";

const rootDir = process.cwd();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function validatePage(page) {
  const filePath = path.join(rootDir, page.slug, "index.html");
  const html = await fs.readFile(filePath, "utf8");
  const canonical = `https://bmoodcoffee.com/${page.slug}/`;

  assert(html.includes(`<link rel="canonical" href="${canonical}" />`), `Missing canonical for ${page.slug}`);
  assert((html.match(/<h1\b/gi) ?? []).length === 1, `Expected one H1 in ${page.slug}`);
  assert(html.includes("<meta name=\"description\""), `Missing description in ${page.slug}`);
  assert(html.includes("\"@type\": \"FAQPage\""), `Missing FAQ schema in ${page.slug}`);
  assert(html.includes("Questions frecuentes".replace("Questions", "Preguntas")), `Missing visible FAQ heading in ${page.slug}`);
}

async function validateSitemap() {
  const sitemap = await fs.readFile(path.join(rootDir, "sitemap.xml"), "utf8");
  for (const page of localPagesData) {
    assert(
      sitemap.includes(`<loc>https://bmoodcoffee.com/${page.slug}/</loc>`),
      `Sitemap missing ${page.slug}`
    );
  }
}

await Promise.all(localPagesData.map(validatePage));
await validateSitemap();

console.log(`Validated ${localPagesData.length} local SEO pages and sitemap entries.`);
