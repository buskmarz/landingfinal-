import fs from "node:fs/promises";
import path from "node:path";
import { localPagesData } from "./local-pages-data.mjs";

const rootDir = process.cwd();
const requiredStaticSitemapEntries = [
  "https://bmoodcoffee.com/",
  "https://bmoodcoffee.com/menu/",
  "https://bmoodcoffee.com/ruleta/",
  "https://bmoodcoffee.com/cbd-en-el-cafe/",
  "https://bmoodcoffee.com/game/moodi-maze/",
  "https://bmoodcoffee.com/cafe-para-negocios-puebla/",
  "https://bmoodcoffee.com/ubicaciones/",
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
  const business = await fs.readFile(path.join(rootDir, "cafe-para-negocios-puebla", "index.html"), "utf8");
  const locations = await fs.readFile(path.join(rootDir, "ubicaciones", "index.html"), "utf8");
  const sharedPages = await Promise.all(
    ["arcade/index.html", "eventos/index.html", "recompensas/index.html"].map((file) =>
      fs.readFile(path.join(rootDir, file), "utf8")
    )
  );
  const rewards = sharedPages[2];
  const rewardsCss = await fs.readFile(path.join(rootDir, "recompensas", "rewards.css"), "utf8");

  assert(!home.includes('"@type": "CoffeeShop"'), "Home uses invalid CoffeeShop schema type");
  assert((home.match(/"@type": "CafeOrCoffeeShop"/g) ?? []).length === 1, "Home must describe the active UPAEP branch only");
  assert(home.includes('"url": "https://bmoodcoffee.com/cafeteria-en-la-paz-puebla/"'), "Home schema missing La Paz URL");
  assert(!/cholula|udlap|4 norte|san andrés/i.test(home), "Home still exposes the paused branch");
  assert(netlify.includes('from = "/seo/*"') && netlify.includes("status = 404"), "Internal SEO sources are not blocked");
  assert(
    netlify.includes('from = "/cbd-en-el-cafe"') && netlify.includes('to = "/cbd-en-el-cafe/"'),
    "CBD guide route is not canonicalized"
  );
  assert(
    netlify.includes('from = "/cbd-no-psicoactivo-puebla/*"') && netlify.includes('to = "/cbd-en-el-cafe/"'),
    "Legacy CBD local route is not consolidated"
  );
  for (const html of sharedPages) {
    assert(!html.includes("https://g.page/r/Coffee/review"), "Broken generic Google Reviews link remains");
  }

  assert(rewards.includes('<link rel="canonical" href="https://bmoodcoffee.com/recompensas/" />'), "Rewards canonical missing");
  assert((rewards.match(/<h1\b/gi) ?? []).length === 1, "Rewards must have one H1");
  assert(rewards.includes("Consulta tu saldo Better Mood."), "Rewards primary task is unclear");
  assert(rewards.includes("/#sucursales") && home.includes('id="sucursales"'), "Rewards menu link does not reach the branch selector");
  assert(!/\$420\.02|cashback|CBD/i.test(rewards) && !/\bTODO\b/.test(rewards), "Rewards contains legacy, fictional, or internal copy");
  assert((rewards.match(/data-portal-[a-z-]+/g) ?? []).length >= 20, "Rewards portal contract is incomplete");
  assert(rewardsCss.includes("[hidden] { display: none !important; }"), "Rewards hidden states can leak before authentication");
  assert(business.includes('<link rel="canonical" href="https://bmoodcoffee.com/cafe-para-negocios-puebla/" />'), "B2B canonical missing");
  assert((business.match(/<h1\b/gi) ?? []).length === 1, "B2B page must have one H1");
  assert(business.includes('name="cafe-b2b"') && business.includes('data-netlify="true"'), "B2B Netlify form missing");
  assert(!/precio desde|pedido mínimo de|entrega garantizada/i.test(business), "B2B page contains unverified commercial promises");
  assert(locations.includes('<link rel="canonical" href="https://bmoodcoffee.com/ubicaciones/" />'), "Locations canonical missing");
  assert((locations.match(/<h1\b/gi) ?? []).length === 1, "Locations must have one H1");
  assert(locations.includes("https://maps.app.goo.gl/Cx8Rz7zSEPTYzUxr6?g_st=ic"), "UPAEP verified Maps link missing");
  assert(!/cholula|udlap|4 norte|san andrés/i.test(locations), "Locations page still exposes the paused branch");
  assert(netlify.includes('from = "/cholula/*"') && netlify.includes('to = "/cafeteria-en-la-paz-puebla/"'), "Paused branch redirect missing");
  assert(netlify.includes('from = "/menu-cholula/*"') && netlify.includes('to = "/menu/"'), "Paused menu redirect missing");
}

const pageStates = await Promise.all(localPagesData.map(validatePage));
await validateRoulette();
await validatePublicShell();
await validateSitemap(pageStates);

console.log(`Validated ${localPagesData.length} local SEO pages and sitemap entries.`);
