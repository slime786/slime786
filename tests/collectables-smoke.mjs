import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync("collectables/app.js", "utf8");
const shop = fs.readFileSync("collectables/shop.html", "utf8");
const splash = fs.readFileSync("collectables/index.html", "utf8");
const designSystem = fs.readFileSync("collectables/design-system.css", "utf8");
const splashSystem = fs.readFileSync("collectables/splash-system.css", "utf8");
const migration = fs.readFileSync("collectables/supabase/migrations/20261004091955_collectables_checkout_hardening.sql", "utf8");
const regression = fs.readFileSync("collectables/supabase/tests/order-flow-regression.sql", "utf8");
const failures = [];

function fail(message){ failures.push(message); }

const demoMatch = app.match(/const DEMO_MODE\s*=\s*(true|false)/);
if(!demoMatch || demoMatch[1] !== "true") fail("DEMO_MODE must stay true before launch");

const paypalMatch = app.match(/const PAYPAL_CLIENT_ID\s*=\s*"([^"]*)"/);
if(!paypalMatch || paypalMatch[1] !== "") fail("PAYPAL_CLIENT_ID must stay empty in source before launch");

if(/PAYPAL_CLIENT_SECRET\s*=|sb_secret_|sk_live_|sk_test_|re_[A-Za-z0-9]{20,}/i.test(app)) {
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
if(app.includes("row.innerHTML=")) {
  fail("cart rows must not interpolate catalogue text through innerHTML");
}
if(!app.includes("function syncFilterState(filter)")) {
  fail("filter aria state synchronisation missing");
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
  'role="dialog" aria-modal="true"',
  'aria-controls="mobile-search-panel" aria-expanded="false"',
  'data-filter="all" aria-pressed="true"'
]) {
  if(!shop.includes(marker)) fail(`shop missing marker: ${marker}`);
}

if(shop.includes("slimes-collectables") && shop.includes("Shop repo")) {
  fail("live shop must not link customers to the secondary history repository");
}
if(!shop.includes('cancellation-form.html')) {
  fail("shop footer must link the cancellation form");
}
if(!fs.existsSync("collectables/business-info.js")) {
  fail("seller business-info loader is missing");
}
if(!fs.existsSync("collectables/cancellation-form.html")) {
  fail("model cancellation form is missing");
}
if(!shop.includes('design-system.css?v=20261008-1')) {
  fail("shop must load the versioned storefront design system");
}
if(!splash.includes('splash-system.css?v=20261008-1')) {
  fail("splash must load the versioned splash design system");
}
for (const marker of [
  "--sc-green:",
  "--sc-surface-1:",
  "--sc-radius-lg:",
  "--sc-ease:",
  ".product-card",
  ".cart-drawer",
  ".policy-page"
]) {
  if(!designSystem.includes(marker)) fail(`design system missing contract marker: ${marker}`);
}
for (const marker of [
  "--splash-green:",
  ".enter-hotspot",
  "@media(prefers-reduced-motion:reduce)"
]) {
  if(!splashSystem.includes(marker)) fail(`splash design system missing contract marker: ${marker}`);
}

const edgeFunctionPaths = [
  "collectables/supabase/functions/collectables-create-order/index.ts",
  "collectables/supabase/functions/collectables-capture-order/index.ts",
  "collectables/supabase/functions/collectables-catalog/index.ts",
  "collectables/supabase/functions/collectables-paypal-webhook/index.ts"
];

const publicInfoPath = "collectables/supabase/functions/collectables-public-info/index.ts";

for (const path of edgeFunctionPaths) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes('npm:@supabase/supabase-js@2.117.2')) {
    fail(`${path}: Supabase JS must be pinned to the reviewed version`);
  }
  if (!source.includes('"Cache-Control": "no-store"')) {
    fail(`${path}: no-store response safeguard missing`);
  }
}

for (const path of edgeFunctionPaths.slice(0,3)) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes('const PROD_ORIGIN = "https://slime786.github.io";')) {
    fail(`${path}: missing exact production origin`);
  }
  if (!source.includes('url.hostname === "localhost" || url.hostname === "127.0.0.1"')) {
    fail(`${path}: missing localhost sandbox origin support`);
  }
  if (source.includes('startsWith("https://slime786.github.io")')) {
    fail(`${path}: loose startsWith origin check must not return`);
  }
}

const createOrder = fs.readFileSync(edgeFunctionPaths[0], "utf8");
for (const marker of [
  'COLLECTABLES_NEW_ORDERS_ENABLED',
  'collectables_checkout_rate_limit',
  'collectables_attach_paypal_order',
  'checkout_rate_limited',
  'liveCommerceReady',
  'COLLECTABLES_PUBLIC_BUSINESS_INFO_ENABLED'
]) {
  if(!createOrder.includes(marker)) fail(`create-order missing safeguard: ${marker}`);
}

const captureOrder = fs.readFileSync(edgeFunctionPaths[1], "utf8");
for (const marker of [
  'COLLECTABLES_CAPTURES_ENABLED',
  'collectables_begin_capture',
  'collectables_mark_order_review',
  'shippingCountry !== "GB"',
  '/v2/checkout/orders/',
  'orderData.status !== "APPROVED"',
  'liveCommerceReady',
  'sendOrderConfirmation',
  'Idempotency-Key'
]) {
  if(!captureOrder.includes(marker)) fail(`capture-order missing safeguard: ${marker}`);
}

const webhook = fs.readFileSync(edgeFunctionPaths[3], "utf8");
for (const marker of [
  'PAYPAL_WEBHOOK_ID',
  '/v1/notifications/verify-webhook-signature',
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.CAPTURE.PENDING',
  'PAYMENT.CAPTURE.DENIED',
  'collectables_paypal_webhook_events',
  'confirmation_email_sent_at'
]) {
  if(!webhook.includes(marker)) fail(`PayPal webhook missing safeguard: ${marker}`);
}

for (const marker of [
  "'capturing'",
  "'review'",
  "collectables_checkout_rate_limit",
  "collectables_attach_paypal_order",
  "collectables_begin_capture",
  "collectables_mark_order_review",
  "collectables_mark_capture_failed",
  "collectables_paypal_webhook_events"
]) {
  if(!migration.includes(marker)) fail(`checkout hardening migration missing: ${marker}`);
}

for (const marker of [
  "begin;",
  "rollback;",
  "capture_amount_mismatch",
  "paid_order_payment_mismatch",
  "collectables_expire_reservations",
  "collectables_catalog()"
]) {
  if(!regression.includes(marker)) fail(`order-flow regression missing: ${marker}`);
}

if(failures.length){
  console.error("Collectables smoke check failed.");
  failures.forEach(x=>console.error("-",x));
  process.exit(1);
}

console.log("Collectables safety, checkout hardening, catalogue and accessibility markers verified.");
