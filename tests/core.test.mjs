import test from "node:test";
import assert from "node:assert/strict";
import { organizerDemo, towelDemo } from "../lib/demos.ts";
import { normalizeProfile } from "../lib/facts.ts";
import { buildMessages, generateListing } from "../lib/generate.ts";
import { parseModelJson } from "../lib/listing.ts";
import { validateListing } from "../lib/validate.ts";
import { createExport } from "../lib/export.ts";
import { readJson, errorResponse } from "../lib/http.ts";
import { POST as checkRoute } from "../app/api/check-listing/route.ts";
import { POST as exportRoute } from "../app/api/export-listing/route.ts";
import { towelListing, organizerListing } from "./fixtures.mjs";

const profile = () => normalizeProfile(towelDemo());
const hasBlock = (listing, fragment) => validateListing(profile(), listing).checks.some(c => c.severity === "block" && c.id.includes(fragment));
const request = body => new Request("http://localhost/api/check-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const modelResponse = (listing = towelListing()) => Response.json({ choices: [{ message: { content: JSON.stringify(listing) } }], usage: { total_tokens: 120 } });

for (const invalid of [null, [], "string", {}, { ...towelDemo(), facts: null }, { ...towelDemo(), marketplace: "ebay" }]) test("reject invalid product shape: " + JSON.stringify(invalid)?.slice(0, 65), () => assert.throws(() => normalizeProfile(invalid)));
test("reject duplicate and unknown facts and status/source enum attacks", () => {
  const p = towelDemo(); p.facts[1] = p.facts[0]; assert.throws(() => normalizeProfile(p), /重复/);
  for (const patch of [{ key: "__proto__" }, { status: "trusted" }, { source: "constructor" }]) {
    const q = towelDemo(); Object.assign(q.facts[0], patch); assert.throws(() => normalizeProfile(q));
  }
});
test("exclude pending values, source notes and keyword instructions from model", () => {
  const p = organizerDemo(); const f = p.facts.find(f => f.key === "material"); f.value = "SECRET_PENDING_MATERIAL";
  p.keywords = "INJECTED_KEYWORD";
  const prompt = JSON.stringify(buildMessages(normalizeProfile(p)));
  assert.doesNotMatch(prompt, /SECRET_PENDING_MATERIAL|INJECTED_KEYWORD|三张实物照片/);
  assert.match(prompt, /Pull-out access/);
});
test("a claimed confirmed field with unknown wording or no source stays excluded", () => {
  for (const change of [{ value: "可能是棉", sourceNote: "资料" }, { value: "cotton", sourceNote: "" }]) {
    const p = towelDemo(); Object.assign(p.facts.find(f => f.key === "material"), change);
    assert.equal(normalizeProfile(p).facts.find(f => f.key === "material").allowedInListing, false);
  }
});
test("reject oversized inputs without silent truncation", () => {
  const p = towelDemo(); p.facts[0].value = "x".repeat(1201); assert.throws(() => normalizeProfile(p));
});
test("complete multi-category fixture passes covered rules", () => {
  const r = validateListing(profile(), towelListing()); assert.equal(r.counts.block, 0); assert.equal(r.counts.warn, 0); assert.equal(r.canExportReviewed, true);
});
test("incomplete organizer permits drafting but not reviewed export", () => {
  const r = validateListing(normalizeProfile(organizerDemo()), organizerListing());
  assert.equal(r.counts.block, 0); assert.ok(r.checks.some(c => c.id === "fact.material")); assert.equal(r.canExportReviewed, false);
});
test("title 75/76 character boundary and item highlights boundary", () => {
  const l = towelListing(); l.title.text = "x".repeat(75); assert.equal(hasBlock(l, "title.length"), false);
  l.title.text += "x"; assert.equal(hasBlock(l, "title.length"), true);
  l.itemHighlights.text = "x".repeat(126); assert.equal(hasBlock(l, "highlights.length"), true);
});
test("search terms count UTF-8 bytes rather than JS characters", () => {
  const l = towelListing(); l.searchTerms.text = "界".repeat(83); assert.equal(hasBlock(l, "search.bytes"), false);
  l.searchTerms.text += "a"; assert.equal(hasBlock(l, "search.bytes"), true);
});
test("English number words and invented dimensions are caught", () => {
  const l = towelListing(); l.description.text = "Includes twelve towels, measuring 45 cm.";
  assert.equal(hasBlock(l, "numbers"), true); assert.equal(hasBlock(l, "measurement"), true);
});
test("pack count cannot justify weight or load", () => {
  const l = towelListing(); l.description = { text: "Supports 4 kg.", factIds: ["packQuantity"] };
  assert.equal(hasBlock(l, "measurement.4.kg"), true);
});
test("same numeric value in wrong unit is rejected", () => {
  const l = towelListing(); l.description = { text: "Measures 18 x 24 cm.", factIds: ["dimensions"] }; assert.equal(hasBlock(l, "measurement"), true);
});
test("unsupported material, guarantee and certification are blocked", () => {
  for (const text of ["Made from bamboo.", "Guaranteed best product.", "FDA certified.", "BPA-free material."]) {
    const l = towelListing(); l.description.text = text; assert.ok(validateListing(profile(), l).counts.block > 0, text);
  }
});
test("100% cotton is evidence-backed, not an absolute performance promise", () => assert.equal(hasBlock(towelListing(), "restricted"), false));
test("photo arrangement does not prove stackability", () => {
  const l = organizerListing(); l.description = { text: "Stackable locking drawers.", factIds: ["structure"] };
  assert.ok(validateListing(normalizeProfile(organizerDemo()), l).checks.some(c => c.severity === "block" && c.label === "无依据功能声明"));
});
test("empty and pending citations are blocked", () => {
  const l = towelListing(); l.title.factIds = []; assert.equal(hasBlock(l, "sources"), true);
  l.title.factIds = ["weight"]; assert.equal(hasBlock(l, "sources"), true);
});
test("custom banned terms do not execute regex syntax", () => {
  const p = profile(); p.bannedTerms = ["(a+)+$"]; const l = towelListing(); l.description.text += " (a+)+$";
  assert.ok(validateListing(p, l).checks.some(c => c.label === "命中自定义禁用词"));
});
test("reject malformed JSON, commentary, invalid citations and missing fields", () => {
  for (const value of ["hello", "prefix " + JSON.stringify(towelListing()), JSON.stringify({ title: "hi" }), JSON.stringify({ ...towelListing(), title: { text: "Test", factIds: ["invented"] } })]) assert.throws(() => parseModelJson(value));
  assert.equal(parseModelJson("```json\n" + JSON.stringify(towelListing()) + "\n```").title.text, towelListing().title.text);
});
test("parser preserves overlong title so validation can report it", () => {
  const l = towelListing(); l.title.text = "x".repeat(300); assert.equal(parseModelJson(JSON.stringify(l)).title.text.length, 300);
});
test("generation passes server key to only the approved endpoint and never returns it", async () => {
  let calls = 0;
  const result = await generateListing(towelDemo(), { apiKey: "test-private-key" }, { fetch: async (url, options) => {
    calls++; assert.equal(url, "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-private-key"); return modelResponse();
  } });
  assert.equal(calls, 1); assert.equal(result.report.counts.block, 0); assert.equal(result.generation.totalTokens, 120); assert.doesNotMatch(JSON.stringify(result), /test-private-key/);
});
test("reject unapproved endpoint before any network call", async () => {
  await assert.rejects(generateListing(towelDemo(), { apiKey: "secret", baseUrl: "https://example.com" }), e => e.code === "INVALID_CONFIG");
});
test("retry malformed model output only once", async () => {
  let n = 0; const r = await generateListing(towelDemo(), { apiKey: "test" }, { fetch: async () => ++n === 1 ? Response.json({ choices: [{ message: { content: "not json" } }] }) : modelResponse() });
  assert.equal(n, 2); assert.equal(r.generation.attempts, 2);
});
test("persistent invalid output is bounded to two calls", async () => {
  let n = 0; await assert.rejects(generateListing(towelDemo(), { apiKey: "test" }, { fetch: async () => { n++; return Response.json({}); } })); assert.equal(n, 2);
});
test("risk feedback repairs citations once but never suppresses remaining risks", async () => {
  let n = 0; const bad = towelListing(); bad.searchTerms.factIds = [];
  const repaired = await generateListing(towelDemo(), { apiKey: "test" }, { fetch: async (_url, options) => {
    if (++n === 1) return modelResponse(bad);
    assert.match(options.body, /failures/); return modelResponse();
  } });
  assert.equal(repaired.report.counts.block, 0); assert.equal(n, 2);
  n = 0;
  const unresolved = await generateListing(towelDemo(), { apiKey: "test" }, { fetch: async () => { n++; return modelResponse(bad); } });
  assert.equal(n, 2); assert.ok(unresolved.report.counts.block > 0); assert.equal(unresolved.report.canExportReviewed, false);
});
test("quota and auth responses do not retry or expose upstream secrets", async () => {
  for (const status of [401, 403, 429]) {
    let n = 0;
    await assert.rejects(generateListing(towelDemo(), { apiKey: "secret" }, { fetch: async () => { n++; return new Response("secret upstream body", { status }); } }), e => { assert.doesNotMatch(e.message, /secret/); return true; });
    assert.equal(n, 1);
  }
});
test("server errors retry once and timeout aborts", async () => {
  let n = 0; await generateListing(towelDemo(), { apiKey: "test" }, { fetch: async () => ++n === 1 ? new Response(null, { status: 503 }) : modelResponse() }); assert.equal(n, 2);
  await assert.rejects(generateListing(towelDemo(), { apiKey: "test" }, { timeoutMs: 15, fetch: async (_u, opts) => new Promise((_resolve, reject) => opts.signal.addEventListener("abort", () => reject(new Error("aborted")))) }), e => e.code === "MODEL_TIMEOUT");
});
test("missing key is a readable setup error", async () => { await assert.rejects(generateListing(towelDemo(), {}), e => e.status === 503); });
test("HTTP rejects invalid JSON, content type, oversized stream and foreign origin", async () => {
  for (const [body, headers, status] of [["bad", { "content-type": "application/json" }, 400], ["{}", {}, 415], ["{}", { "content-type": "application/json", origin: "https://evil.example" }, 403], ["x".repeat(32769), { "content-type": "application/json" }, 413]]) {
    await assert.rejects(readJson(new Request("http://localhost/api", { method: "POST", headers, body })), e => e.status === status);
  }
});
test("export recalculates report instead of trusting client flags", () => {
  const input = { profile: organizerDemo(), listing: organizerListing(), mode: "reviewed", humanReviewed: true, report: { canExportReviewed: true } };
  assert.throws(() => createExport(input), e => e.status === 409);
  assert.equal(createExport({ ...input, mode: "draft" }).humanReviewed, false);
});
test("reviewed export requires positive human confirmation and safe content", () => {
  const input = { profile: towelDemo(), listing: towelListing(), mode: "reviewed" };
  assert.throws(() => createExport(input)); assert.equal(createExport({ ...input, humanReviewed: true }).humanReviewed, true);
  input.listing.title.text = "FDA certified towels";
  assert.throws(() => createExport({ ...input, humanReviewed: true }));
});
test("check and export route integration, no-store and error sanitization", async () => {
  const r = await checkRoute(request({ profile: towelDemo(), listing: towelListing() })); assert.equal(r.status, 200); assert.equal((await r.json()).report.canExportReviewed, true); assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal((await exportRoute(request({ profile: organizerDemo(), listing: organizerListing(), mode: "reviewed", humanReviewed: true }))).status, 409);
  assert.doesNotMatch(await errorResponse(new Error("secret")).text(), /secret/);
});
