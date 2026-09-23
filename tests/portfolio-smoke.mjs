import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const splash = fs.readFileSync(path.join(root, "index.html"), "utf8");
const portfolio = fs.readFileSync(path.join(root, "portfolio.html"), "utf8");
const missing = [];

function checkLocalRefs(html, label) {
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    const value = match[1].split("?")[0].split("#")[0];
    if (!value || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
    const clean = value.replace(/^\/slime786\//, "").replace(/^\.\//, "").replace(/^\//, "");
    if (!clean) continue;
    const target = path.join(root, clean);
    if (!fs.existsSync(target)) missing.push(`${label}: ${value}`);
  }
}

checkLocalRefs(splash, "splash");
checkLocalRefs(portfolio, "portfolio");

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

console.log("Splash and portfolio local links, assets and core sections verified.");
