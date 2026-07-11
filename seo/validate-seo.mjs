import fs from "node:fs/promises";
import path from "node:path";
import { localPagesData } from "./local-pages-data.mjs";

const rootDir = process.cwd();
const requiredStaticSitemapEntries = [
  "https://bmoodcoffee.com/",
  "https://bmoodcoffee.com/menu/",
  "https://bmoodcoffee.com/menu-cholula/",
  "https://bmoodcoffee.com/cholula/",
  "https://bmoodcoffee.com/ruleta/",
];

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
  if (html.includes('class="local-guide-page"')) {
    assert(html.includes("\"@type\": \"FAQPage\""), `Missing FAQ schema in ${page.slug}`);
    assert(html.includes("Questions frecuentes".replace("Questions", "Preguntas")), `Missing visible FAQ heading in ${page.slug}`);
  }

  return { page, indexable: !html.includes('content="noindex,follow"') };
}

async function validateSitemap(pageStates) {
  const sitemap = await fs.readFile(path.join(rootDir, "sitemap.xml"), "utf8");
  for (const url of requiredStaticSitemapEntries) {
    assert(sitemap.includes(`<loc>${url}</loc>`), `Sitemap missing ${url}`);
  }
  for (const { page, indexable } of pageStates) {
    const entry = `<loc>https://bmoodcoffee.com/${page.slug}/</loc>`;
    if (indexable) {
      assert(sitemap.includes(entry), `Sitemap missing ${page.slug}`);
    } else {
      assert(!sitemap.includes(entry), `Noindex page present in sitemap: ${page.slug}`);
    }
  }
}

async function validateRoulette() {
  const html = await fs.readFile(path.join(rootDir, "ruleta", "index.html"), "utf8");
  assert(html.includes('<link rel="canonical" href="https://bmoodcoffee.com/ruleta/" />'), "Missing canonical for ruleta");
  assert((html.match(/<h1\b/gi) ?? []).length === 1, "Expected one H1 in ruleta");
  assert(html.includes('<meta name="description"'), "Missing description in ruleta");
}

const pageStates = await Promise.all(localPagesData.map(validatePage));
await validateRoulette();
await validateSitemap(pageStates);

console.log(`Validated ${localPagesData.length} local SEO pages and sitemap entries.`);
