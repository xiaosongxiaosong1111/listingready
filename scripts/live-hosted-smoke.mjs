// One logical generation against the existing owner-private Site, explicit opt-in.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { towelDemo } from "../lib/demos.ts";
if (process.env.RUN_LIVE_TESTS !== "1") throw new Error("RUN_LIVE_TESTS=1 is required; this consumes competition model quota.");
const token = process.env.SITE_TEST_ACCESS_TOKEN;
if (!token) throw new Error("Private Site access credential is required; never store it in source.");
const origin = "https://listingready-demo.coral-rose-4718.chatgpt.site";
const headers = { "Content-Type": "application/json", "OAI-Sites-Authorization": `Bearer ${token}` };
const profile = towelDemo();
async function post(path, body, timeout = 15000) {
  const response = await fetch(origin + path, { method: "POST", headers, body: JSON.stringify(body), redirect: "manual", signal: AbortSignal.timeout(timeout) });
  assert.ok(response.headers.get("content-type")?.includes("application/json"), "Site did not return JSON; stop without another model request.");
  const payload = await response.json();
  assert.ok(!JSON.stringify(payload).includes(token), "Site credential unexpectedly present in response; do not print payload.");
  assert.equal(response.headers.get("cache-control"), "no-store");
  return { status: response.status, payload };
}
const generated = await post("/api/generate-listing", profile, 105000);
await mkdir("outputs", { recursive: true });
const file = `outputs/hosted-smoke-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
const receipt = { testedAt: new Date().toISOString(), origin, logicalModelRequests: 1, status: generated.status,
  ...(generated.status === 200 ? { result: generated.payload } : { errorCode: generated.payload.code }) };
await writeFile(file, JSON.stringify(receipt, null, 2));
assert.equal(generated.status, 200, "Hosted generation failed; stop without retries. See sanitized receipt.");
const result = generated.payload;
assert.equal(result.generation.provider, "aliyun-token-plan");
assert.ok(result.listing.title.text && result.listing.bullets.length);
const checked = await post("/api/check-listing", { profile, listing: result.listing });
assert.equal(checked.status, 200); assert.deepEqual(checked.payload.report, result.report);
const draft = await post("/api/export-listing", { profile, listing: result.listing, mode: "draft" });
assert.equal(draft.status, 200); assert.deepEqual(draft.payload.listing, result.listing);
assert.deepEqual(draft.payload.report, result.report); assert.equal(draft.payload.humanReviewed, false);
const denied = await post("/api/export-listing", { profile, listing: result.listing, mode: "reviewed", humanReviewed: false });
assert.equal(denied.status, 409);
Object.assign(receipt, { recheck: checked.status, draft: draft.status, unreviewedDenied: denied.status });
await writeFile(file, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ status: generated.status, logicalModelRequests: 1, generation: result.generation, counts: result.report.counts, recheck: checked.status, draft: draft.status, unreviewedDenied: denied.status, output: file }));
