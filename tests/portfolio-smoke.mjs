import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const missing = [];

for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
  const value = match[1].split("?")[0].split("#")[0];
  if (!value || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
  const clean = value.replace(/^\/slime786\//, "").replace(/^\.\//, "").replace(/^\//, "");
  if (!clean) continue;
  const target = path.join(root, clean);
  if (!fs.existsSync(target)) missing.push(value);
}

for (const id of ["main-content", "work", "about", "projects", "contact"]) {
  if (!html.includes(`id="${id}"`)) missing.push(`#${id}`);
}

if (missing.length) {
  console.error("Portfolio smoke check failed.");
  [...new Set(missing)].forEach(item => console.error("Missing:", item));
  process.exit(1);
}

console.log("Portfolio local links, assets and core sections verified.");
