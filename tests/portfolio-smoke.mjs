import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const splash = fs.readFileSync(path.join(root, "index.html"), "utf8");
const portfolio = fs.readFileSync(path.join(root, "portfolio.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));
const baseCss = fs.readFileSync(path.join(root, "style.css"), "utf8");
const v11Css = fs.readFileSync(path.join(root, "style-v11.css"), "utf8");
const missing = [];

function checkA11yBasics(html, label) {
  if (!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html)) missing.push(`${label}: html lang`);
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) missing.push(`${label}: viewport meta`);
  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(img[0])) missing.push(`${label}: image missing alt`);
  }
}

function checkLocalRefs(html, label, baseDir = "") {
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    const value = match[1].split("?")[0].split("#")[0];
    if (!value || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;

    let target;
    if (value.startsWith("/slime786/")) {
      target = path.join(root, value.slice("/slime786/".length));
    } else if (value.startsWith("/")) {
      target = path.join(root, value.replace(/^\//, ""));
    } else {
      target = path.join(root, baseDir, value.replace(/^\.\//, ""));
    }

    if (!fs.existsSync(target)) missing.push(`${label}: ${value}`);
  }
}

checkLocalRefs(splash, "splash");
checkLocalRefs(portfolio, "portfolio");
checkA11yBasics(splash, "splash");
checkA11yBasics(portfolio, "portfolio");

for (const [file, label] of [
  ["collectables/index.html", "collectables splash"],
  ["collectables/shop.html", "collectables shop"],
  ["collectables/shipping-returns.html", "collectables shipping and returns"],
  ["collectables/condition-guide.html", "collectables condition guide"],
  ["collectables/terms.html", "collectables terms"],
  ["collectables/privacy.html", "collectables privacy"],
  ["collectables/contact.html", "collectables contact"],
  ["collectables/cancellation-form.html", "collectables cancellation form"],
]) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  checkLocalRefs(html, label, "collectables");
  checkA11yBasics(html, label);
}

for (const id of ["main-content", "work", "about", "projects", "contact"]) {
  if (!portfolio.includes(`id="${id}"`)) missing.push(`portfolio:#${id}`);
}

const portfolioIds = new Set([...portfolio.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]));
for (const match of portfolio.matchAll(/href=["']#([^"']+)["']/gi)) {
  if (!portfolioIds.has(match[1])) missing.push(`portfolio internal anchor #${match[1]}`);
}

if (!splash.includes('href="/slime786/portfolio.html"')) {
  missing.push("splash entry link to portfolio.html");
}
if (!splash.includes('splash-command-center-v17')) {
  missing.push("splash build marker");
}
if (!splash.includes('data-portfolio-metric="repositories"')) {
  missing.push("splash canonical repository metric hook");
}
if (!portfolio.includes('data-portfolio-metric="repositories"')) {
  missing.push("portfolio canonical repository metric hook");
}
if (!Number.isInteger(manifest.summary.repositoryCount) || manifest.summary.repositoryCount < manifest.repositories.length) {
  missing.push("canonical repository count");
}
if (!portfolio.includes('<link rel="canonical" href="https://slime786.github.io/slime786/portfolio.html">')) {
  missing.push("portfolio self-canonical");
}
if (!splash.includes('<link rel="canonical" href="https://slime786.github.io/slime786/">')) {
  missing.push("splash self-canonical");
}
if (!splash.includes('/slime786/style-v11.css?v=1') || !portfolio.includes('/slime786/style-v11.css?v=1')) {
  missing.push("V11 theme stylesheet wiring");
}
if (baseCss.includes("CURRENT THEME BOUNDARY — V11")) {
  missing.push("V11 theme leaked back into base stylesheet");
}
if (!v11Css.includes("CURRENT THEME BOUNDARY — V11")) {
  missing.push("V11 theme boundary missing");
}
if (/var\(--v11-/.test(baseCss)) {
  missing.push("base stylesheet depends on V11-scoped variables");
}


const editorialPages = [
  "journal.html",
  "market-radar.html",
  "weekly-notes.html",
  "article-ai-interface.html",
  "article-good-businesses.html",
  "article-infrastructure.html",
  "article-living-portfolio.html",
  "article-weekly-notes.html",
  "article-ai-infrastructure.html",
  "article-market-noise.html",
  "article-agents-interface.html",
];

for (const file of editorialPages) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const canonical = `https://slime786.github.io/slime786/${file}`;
  if (!html.includes(`rel="canonical" href="${canonical}"`)) missing.push(`${file}: self-canonical`);
  if (!html.includes(`property="og:url" content="${canonical}"`)) missing.push(`${file}: Open Graph URL`);
}

for (const file of [
  "collectables/shipping-returns.html",
  "collectables/condition-guide.html",
  "collectables/terms.html",
  "collectables/privacy.html",
  "collectables/contact.html",
  "collectables/cancellation-form.html",
]) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  if (!/<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html)) {
    missing.push(`${file}: meta description`);
  }
}

const arcade = fs.readFileSync(path.join(root, "arcade.html"), "utf8");
if (!arcade.includes('<h1 class="visually-hidden">Moheen Arcade</h1>')) missing.push("arcade semantic h1");

const collectablesSplash = fs.readFileSync(path.join(root, "collectables/index.html"), "utf8");
if (!collectablesSplash.includes('<h1 class="visually-hidden">Slime\'s Collectables</h1>')) missing.push("collectables splash semantic h1");
if (!collectablesSplash.includes('fetchpriority="high"')) missing.push("collectables splash image priority");
if (!collectablesSplash.includes('width="1672"') || !collectablesSplash.includes('height="941"')) {
  missing.push("collectables splash intrinsic dimensions");
}
if (!collectablesSplash.includes('rel="preconnect" href="https://cdn.openart.ai"')) {
  missing.push("collectables splash CDN preconnect");
}

const caseStudy = fs.readFileSync(path.join(root, "project-personal-command-centre.html"), "utf8");
if (!caseStudy.includes('loading="lazy" decoding="async"')) {
  missing.push("case-study below-fold image loading hint");
}

if (!portfolio.includes('aria-controls="command-palette" aria-expanded="false"')) {
  missing.push("portfolio command trigger dialog state");
}
const scriptSource = fs.readFileSync(path.join(root, "script.js"), "utf8");
for (const marker of ["previousFocus", "getFocusable", "e.key==='Tab'", "target.focus()", "close(true)"]) {
  if (!scriptSource.includes(marker)) missing.push(`keyboard interaction safeguard: ${marker}`);
}

if (missing.length) {
  console.error("Portfolio smoke check failed.");
  [...new Set(missing)].forEach(item => console.error("Missing:", item));
  process.exit(1);
}

console.log("Portfolio and Collectables links, assets and basic accessibility markers verified.");
