// Explicit opt-in only: this script consumes the competition API quota.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { organizerDemo, towelDemo } from "../lib/demos.ts";

if (process.env.RUN_LIVE_TESTS !== "1") throw new Error("Set RUN_LIVE_TESTS=1 to authorize paid model calls.");
const origin = process.env.TEST_ORIGIN ?? "http://localhost:3000";
const receipts = [];
for (const [name, profile] of [["organizer", organizerDemo()], ["towel", towelDemo()]]) {
  const started = Date.now();
  const response = await fetch(origin + "/api/generate-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile), signal: AbortSignal.timeout(105000) });
  const result = await response.json();
  assert.equal(response.status, 200, name + ": " + (result.error ?? "generation failed"));
  assert.equal(result.generation.provider, "aliyun-token-plan");
  assert.ok(result.listing.title.text && result.listing.bullets.length);
  assert.ok(result.report.checks.length);
  const check = await fetch(origin + "/api/check-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, listing: result.listing }) });
  assert.equal(check.status, 200);
  assert.deepEqual((await check.json()).report, result.report);
  const draft = await fetch(origin + "/api/export-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, listing: result.listing, mode: "draft" }) });
  assert.equal(draft.status, 200);
  const reviewed = await fetch(origin + "/api/export-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, listing: result.listing, mode: "reviewed", humanReviewed: true }) });
  assert.equal(reviewed.status, result.report.canExportReviewed ? 200 : 409);
  receipts.push({ name, testedAt: new Date().toISOString(), httpStatus: response.status, elapsedMs: Date.now() - started, result });
  console.log(JSON.stringify({ name, httpStatus: response.status, title: result.listing.title.text, ...result.generation, counts: result.report.counts, findings: result.report.checks.filter(c => c.severity !== "pass").map(c => ({ id: c.id, detail: c.detail })) }));
}
await mkdir("outputs", { recursive: true });
await writeFile("outputs/live-smoke-2026-09-07.json", JSON.stringify(receipts, null, 2));
console.log("Live HTTP generation, recheck and export checks passed for both cases.");
