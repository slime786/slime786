import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "collectables/app.js"), "utf8");
const failures = [];
const checks = [
  { name: "Demo mode remains enabled on public storefront", pass: /const DEMO_MODE\s*=\s*true\s*;/.test(source) },
  { name: "Browser PayPal Client ID is not configured", pass: /const PAYPAL_CLIENT_ID\s*=\s*""\s*;/.test(source) },
  { name: "PayPal mode is sandbox", pass: /const PAYPAL_MODE\s*=\s*"sandbox"\s*;/.test(source) },
  { name: "Checkout remains localhost-only in demo mode", pass: source.includes('["localhost","127.0.0.1"].includes(window.location.hostname)') },
];
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
  if (!item.pass) failures.push(item.name);
}
if (failures.length) {
  console.error("Unexpected storefront launch-state change. Review before proceeding.");
  process.exit(1);
}
console.log("");
console.log("BLOCKED: No verified live inventory or PayPal sandbox credentials have been confirmed.");
console.log("Do not enable server order/capture gates or public checkout.");
console.log("Next: add verified inventory, configure sandbox credentials server-side, then rehearse on localhost.");
