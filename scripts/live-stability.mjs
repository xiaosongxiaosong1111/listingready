// Explicit, bounded live acceptance. Never included in the default test command.
import { mkdir, writeFile } from "node:fs/promises";
import { organizerDemo, towelDemo } from "../lib/demos.ts";
if (process.env.RUN_LIVE_TESTS !== "1") throw new Error("RUN_LIVE_TESTS=1 is required; this consumes API quota.");
const origin = process.env.TEST_ORIGIN ?? "http://localhost:3000";
const receipts = [];
await mkdir("outputs", { recursive: true });
const output = `outputs/live-stability-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
for (let i = 0; i < 10; i++) {
  const name = i % 2 ? "towel" : "organizer";
  const profile = i % 2 ? towelDemo() : organizerDemo();
  let response, result;
  try {
    response = await fetch(origin + "/api/generate-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile), signal: AbortSignal.timeout(105000) });
    result = await response.json();
  } catch { receipts.push({ sequence: i + 1, name, outcome: "transport_failed" }); await writeFile(output, JSON.stringify(receipts, null, 2)); throw new Error("Live acceptance stopped after a transport failure; see saved receipts."); }
  receipts.push({ sequence: i + 1, name, testedAt: new Date().toISOString(), status: response.status, result });
  await writeFile(output, JSON.stringify(receipts, null, 2));
  console.log(JSON.stringify({ sequence: i + 1, name, status: response.status, generation: result.generation, counts: result.report?.counts, errorCode: result.code }));
  if (!response.ok) throw new Error("Live acceptance stopped after a failed response; do not spend quota on repeated errors.");
}
console.log(JSON.stringify({ totalLogicalRequests: receipts.length, validFinalResponses: receipts.filter(r => r.status === 200).length, validWithoutFormatRetry: receipts.filter(r => r.status === 200 && r.result.generation.formatFailures === 0).length, physicalRequests: receipts.reduce((n, r) => n + r.result.generation.attempts, 0), fullyReviewedRulePasses: receipts.filter(r => r.result.report.canExportReviewed).length, note: "Formatting success is not factual accuracy or platform approval.", output }));
