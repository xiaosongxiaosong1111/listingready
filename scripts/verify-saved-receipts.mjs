// Recheck existing live results over HTTP without calling any model.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { normalizeProfile } from "../lib/facts.ts";
import { validateListing } from "../lib/validate.ts";
const origin = process.env.TEST_ORIGIN ?? "http://localhost:3000";
const accessToken = process.env.SITE_TEST_ACCESS_TOKEN;
const headers = { "Content-Type": "application/json" };
if (accessToken) {
  if (origin !== "https://listingready-demo.coral-rose-4718.chatgpt.site") throw new Error("Private Site access credential is restricted to the existing approved Site origin.");
  headers["OAI-Sites-Authorization"] = `Bearer ${accessToken}`;
}
const file = process.argv[2];
if (!file) throw new Error("Provide a saved live-stability JSON receipt file.");
const receipts = JSON.parse(await readFile(file, "utf8"));
const outcomes = [];
for (const receipt of receipts) {
  if (receipt.status !== 200 || !receipt.result) continue;
  const { profile, listing } = receipt.result;
  const expected = validateListing(normalizeProfile(profile), listing);
  async function post(path, body) {
    const response = await fetch(origin + path, { method: "POST", headers, redirect: "manual", body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    assert.equal(response.headers.get("cache-control"), "no-store");
    return { status: response.status, body: await response.json() };
  }
  const check = await post("/api/check-listing", { profile, listing });
  assert.equal(check.status, 200); assert.deepEqual(check.body.report, expected);
  const draft = await post("/api/export-listing", { profile, listing, mode: "draft" });
  assert.equal(draft.status, 200); assert.deepEqual(draft.body.listing, listing);
  assert.deepEqual(draft.body.report, expected); assert.equal(draft.body.humanReviewed, false);
  const denied = await post("/api/export-listing", { profile, listing, mode: "reviewed", humanReviewed: false });
  assert.equal(denied.status, 409);
  outcomes.push({ sequence: receipt.sequence, ruleVersion: expected.ruleVersion, check: check.status, draft: draft.status, unreviewedDenied: denied.status, counts: expected.counts });
}
assert.ok(outcomes.length > 0);
const output = `outputs/saved-receipts-check-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
await writeFile(output, JSON.stringify({ testedAt: new Date().toISOString(), origin, modelCalls: 0, source: file, outcomes }, null, 2));
console.log(JSON.stringify({ verified: outcomes.length, httpRequests: outcomes.length * 3, modelCalls: 0, output }));
