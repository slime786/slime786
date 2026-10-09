import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = {
  browser: "collectables/app.js",
  create: "collectables/supabase/functions/collectables-create-order/index.ts",
  capture: "collectables/supabase/functions/collectables-capture-order/index.ts",
  webhook: "collectables/supabase/functions/collectables-paypal-webhook/index.ts",
  catalog: "collectables/supabase/functions/collectables-catalog/index.ts",
  regression: "collectables/supabase/tests/order-flow-regression.sql"
};
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [
  key, readFileSync(resolve(root, file), "utf8")
]));

const rules = [
  ["Public store is demo-only", /const DEMO_MODE\s*=\s*true/.test(source.browser)],
  ["Public PayPal ID not published", /const PAYPAL_CLIENT_ID\s*=\s*""/.test(source.browser)],
  ["Public store sandbox mode", /const PAYPAL_MODE\s*=\s*"sandbox"/.test(source.browser)],
  ["Server new-order gate defaults closed", source.create.includes('COLLECTABLES_NEW_ORDERS_ENABLED') && source.create.includes('=== "true"')],
  ["Server capture gate defaults closed", source.capture.includes('COLLECTABLES_CAPTURES_ENABLED') && source.capture.includes('=== "true"')],
  ["Server prices stock from reservation RPC", source.create.includes("collectables_reserve_order") && source.create.includes("order.total_pence")],
  ["Server checks PayPal shipping country", source.capture.includes('shippingCountry !== "GB"')],
  ["Server validates PayPal capture currency and total", source.capture.includes("moneyToPence") && source.capture.includes("collectables_finalize_order")],
  ["Webhook verifies external PayPal signature", source.webhook.includes("verify-webhook-signature")],
  ["Regressions assert capture mismatch", source.regression.includes("capture_amount_mismatch")],
  ["Regressions assert idempotency", source.regression.includes("paid_order_payment_mismatch")]
];
for(const [label, pass] of rules)console.log(`${pass ? "PASS" : "FAIL"} ${label}`);
assert.ok(rules.every(([,pass])=>pass),"Commerce rehearsal guardrails failed");
console.log("Guardrails passed. This does NOT validate a real PayPal sandbox transaction.");
