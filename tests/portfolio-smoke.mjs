import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const splash = fs.readFileSync(path.join(root, "index.html"), "utf8");
const portfolio = fs.readFileSync(path.join(root, "portfolio.html"), "utf8");
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

if (missing.length) {
  console.error("Portfolio smoke check failed.");
  [...new Set(missing)].forEach(item => console.error("Missing:", item));
  process.exit(1);
}

console.log("Portfolio and Collectables links, assets and basic accessibility markers verified.");
