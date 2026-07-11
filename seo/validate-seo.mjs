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

async function validatePublicShell() {
  const home = await fs.readFile(path.join(rootDir, "index.html"), "utf8");
  const netlify = await fs.readFile(path.join(rootDir, "netlify.toml"), "utf8");
  const sharedPages = await Promise.all(
    ["arcade/index.html", "eventos/index.html", "recompensas/index.html"].map((file) =>
      fs.readFile(path.join(rootDir, file), "utf8")
    )
  );

  assert(!home.includes('"@type": "CoffeeShop"'), "Home uses invalid CoffeeShop schema type");
  assert((home.match(/"@type": "CafeOrCoffeeShop"/g) ?? []).length === 2, "Home must describe both branches");
  assert(home.includes('"url": "https://bmoodcoffee.com/cafeteria-en-la-paz-puebla/"'), "Home schema missing La Paz URL");
  assert(home.includes('"url": "https://bmoodcoffee.com/cholula/"'), "Home schema missing Cholula URL");
  assert(netlify.includes('from = "/seo/*"') && netlify.includes("status = 404"), "Internal SEO sources are not blocked");
  assert(netlify.includes('from = "/cbd-en-el-cafe/*"'), "Legacy CBD route is not consolidated");
  assert(netlify.includes('from = "/cbd-no-psicoactivo-puebla/*"'), "Legacy CBD local route is not consolidated");
  for (const html of sharedPages) {
    assert(!html.includes("https://g.page/r/Coffee/review"), "Broken generic Google Reviews link remains");
  }
}

const pageStates = await Promise.all(localPagesData.map(validatePage));
await validateRoulette();
await validatePublicShell();
await validateSitemap(pageStates);

console.log(`Validated ${localPagesData.length} local SEO pages and sitemap entries.`);
