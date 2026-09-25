import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync("collectables/app.js", "utf8");
const shop = fs.readFileSync("collectables/shop.html", "utf8");
const failures = [];

function fail(message){ failures.push(message); }

const demoMatch = app.match(/const DEMO_MODE\s*=\s*(true|false)/);
if(!demoMatch || demoMatch[1] !== "true") fail("DEMO_MODE must stay true before launch");

const paypalMatch = app.match(/const PAYPAL_CLIENT_ID\s*=\s*"([^"]*)"/);
if(!paypalMatch || paypalMatch[1] !== "") fail("PAYPAL_CLIENT_ID must stay empty in source before launch");

if(/PAYPAL_CLIENT_SECRET\s*=|sb_secret_|sk_live_|sk_test_/i.test(app)) {
  fail("possible secret detected in browser source");
}

if(!app.includes('["localhost","127.0.0.1"].includes(window.location.hostname)')) {
  fail("demo sandbox checkout must remain localhost-only");
}
if(!app.includes("function showCatalogUnavailable()")) {
  fail("live catalogue failure must lock checkout instead of showing demo stock");
}
if(!app.includes('document.querySelector("#cart-close")?.focus()')) {
  fail("cart drawer should move focus on open");
}

const start = app.indexOf("const inventory = [");
const endMarker = "];\n\nlet activeFilter";
const end = app.indexOf(endMarker, start);
if(start < 0 || end < 0) {
  fail("demo inventory block not found");
} else {
  const inventoryCode = app.slice(start, end + 2) + "\nresult = inventory;";
  const sandbox = {result:null};
  vm.createContext(sandbox);
  vm.runInContext(inventoryCode, sandbox, {timeout:1000});
  const items = sandbox.result;

  if(!Array.isArray(items) || items.length < 24) fail("expected at least 24 demo products");

  const ids = new Set();
  for(const item of items || []) {
    if(!item.id || ids.has(item.id)) fail(`duplicate/missing product id: ${item.id || "(missing)"}`);
    ids.add(item.id);
    if(!item.name?.trim()) fail(`${item.id}: missing name`);
    if(!item.imageUrl?.trim()) fail(`${item.id}: missing image`);
    if(!(Number(item.price) > 0)) fail(`${item.id}: invalid price`);
    if(!["pokemon","yugioh"].includes(item.game)) fail(`${item.id}: invalid game`);
    if(!["single","sealed","graded","bundle"].includes(item.type)) fail(`${item.id}: invalid product type`);
    if(!String(item.notes || "").toLowerCase().includes("preview")) fail(`${item.id}: preview disclaimer missing`);
  }
}

for(const marker of [
  'id="product-grid"',
  'id="product-template"',
  'class="product-photo"',
  'id="product-dialog"',
  'id="paypal-button-container"',
  'CATALOGUE PREVIEW',
  'name="robots" content="noindex,follow"',
  'id="checkout-note" role="status" aria-live="polite"',
  'id="catalog-status" role="status" aria-live="polite"',
  'role="dialog" aria-modal="true"'
]) {
  if(!shop.includes(marker)) fail(`shop missing marker: ${marker}`);
}

if(failures.length){
  console.error("Collectables smoke check failed.");
  failures.forEach(x=>console.error("-",x));
  process.exit(1);
}
console.log("Collectables demo safety, catalogue completeness and product-detail markers verified.");
