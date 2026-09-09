import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { organizerDemo, towelDemo } from "../lib/demos.ts";
import { buildSceneRequest, generateScene, IMAGE_ENDPOINT } from "../lib/generate-scene.ts";
import { canReviewScene, safeGeneratedImageUrl, sceneSuggestions, validateReferenceImage } from "../lib/scene.ts";
import { createExport } from "../lib/export.ts";
import { readJson } from "../lib/http.ts";
import { towelListing } from "./fixtures.mjs";
const referenceImage = "data:image/jpeg;base64," + readFileSync(new URL("../public/product/scene-horizontal.jpg", import.meta.url)).toString("base64");
const input = () => ({ profile: organizerDemo(), referenceImage, referenceConfirmed: true, scene: "居家办公桌，自然光", kind: "lifestyle" });
const url = "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/test/image.png";
const response = () => Response.json({ output: { choices: [{ message: { content: [{ image: url }] } }] } });

test("visual review requires the current image to load, consent and idle valid state", () => {
  const valid = { resultId: "new-image", loadedImageId: "new-image", stale: false, busy: false, failed: false, referenceConfirmed: true };
  assert.equal(canReviewScene(valid), true);
  for (const change of [{ resultId: undefined }, { loadedImageId: null }, { loadedImageId: "old-image" }, { stale: true }, { busy: true }, { failed: true }, { referenceConfirmed: false }]) {
    assert.equal(canReviewScene({ ...valid, ...change }), false);
  }
});

test("image request requires actual reference bytes and affirmative consent", () => {
  assert.equal(validateReferenceImage(referenceImage), referenceImage);
  for (const value of ["https://localhost/private.png", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64," + Buffer.from("not a PNG image at all").toString("base64"), "data:image/jpeg;base64," + "a".repeat(1600040)]) assert.throws(() => validateReferenceImage(value));
  assert.throws(() => buildSceneRequest({ ...input(), referenceConfirmed: false }));
});
test("scene request uses one reference, one output, no prompt expansion, and excluded facts never enter", () => {
  const value = input(); value.profile.facts.find(f => f.key === "material").value = "SECRET_PENDING_MATERIAL";
  value.profile.facts.find(f => f.key === "features").sourceNote = "PRIVATE_SOURCE_NOTE";
  const request = buildSceneRequest(value);
  assert.equal(request.body.parameters.n, 1); assert.equal(request.body.parameters.prompt_extend, false); assert.equal(request.body.parameters.watermark, true);
  assert.equal(request.body.parameters.size, undefined);
  assert.match(request.body.parameters.negative_prompt, /changed product arrangement/);
  assert.equal(request.body.input.messages[0].content[0].image, referenceImage);
  assert.doesNotMatch(request.prompt, /SECRET_PENDING_MATERIAL|PRIVATE_SOURCE_NOTE/);
  assert.match(request.prompt, /untrusted DATA/); assert.match(request.prompt, /not an Amazon main image/);
});
test("scene prompt limits reject oversized grounding without truncating facts", () => {
  const value = input(); value.scene = "x".repeat(241); assert.throws(() => buildSceneRequest(value));
  value.scene = "Desk"; value.profile.facts.find(f => f.key === "productName").value = "x".repeat(1200); value.profile.facts.find(f => f.key === "structure").value = "x".repeat(1200);
  assert.throws(() => buildSceneRequest(value), e => e.code === "SCENE_FACTS_TOO_LONG");
});
test("image URLs reject external hosts, embedded credentials and insecure protocols", () => {
  assert.equal(safeGeneratedImageUrl(url), url);
  for (const invalid of ["http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/x", "https://localhost/x", "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com.evil.example/x", "https://user:pass@dashscope-result-bj.oss-cn-beijing.aliyuncs.com/x", "data:image/png;base64,xxxx", "https://example.com/a.png"]) assert.throws(() => safeGeneratedImageUrl(invalid));
});
test("image model uses dedicated endpoint and never returns key or reference bytes", async () => {
  let calls = 0;
  const result = await generateScene(input(), { apiKey: "secret-image-key" }, { fetch: async (endpoint, options) => {
    calls++; assert.equal(endpoint, IMAGE_ENDPOINT); assert.equal(options.redirect, "manual"); assert.equal(options.headers.Authorization, "Bearer secret-image-key"); return response();
  } });
  assert.equal(calls, 1); assert.equal(result.url, url); assert.equal(result.referenceUsed, true);
  assert.doesNotMatch(JSON.stringify(result), /secret-image-key|base64/);
});
test("image failures never auto-retry, including redirects, quota, 5xx and malformed results", async () => {
  for (const status of [307, 401, 403, 429, 500]) {
    let calls = 0;
    await assert.rejects(generateScene(input(), { apiKey: "secret" }, { fetch: async () => { calls++; return new Response("private upstream body", { status }); } }), e => { assert.doesNotMatch(e.message, /private upstream/); return true; });
    assert.equal(calls, 1);
  }
  await assert.rejects(generateScene(input(), { apiKey: "secret" }, { fetch: async () => Response.json({ output: { task_id: "async-task" } }) }), e => e.code === "INVALID_IMAGE_OUTPUT");
});
test("image timeout aborts request and missing key or unsupported model fail before fetch", async () => {
  await assert.rejects(generateScene(input(), { apiKey: "secret" }, { timeoutMs: 10, fetch: async (_u, opts) => new Promise((_resolve, reject) => opts.signal.addEventListener("abort", () => reject(new Error("timeout")))) }), e => e.code === "IMAGE_TIMEOUT");
  await assert.rejects(generateScene(input(), {}), e => e.code === "NOT_CONFIGURED");
  await assert.rejects(generateScene(input(), { apiKey: "x", model: "unverified-model" }), e => e.code === "INVALID_CONFIG");
});
test("larger image body is opt-in; text routes retain 32 KiB boundary", async () => {
  const makeRequest = () => new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input()) });
  await assert.rejects(readJson(makeRequest()), e => e.status === 413);
  assert.equal((await readJson(makeRequest(), 1700000)).referenceConfirmed, true);
});
test("included scene image must be human reviewed and metadata is sanitized on export", () => {
  const marketingImage = { url, kind: "lifestyle", model: "qwen-image-2.0", promptSummary: "Reference-based background edit", generatedAt: "2026-09-08T00:00:00Z", humanReviewed: false, referenceImage, apiKey: "should-not-export" };
  const value = { profile: towelDemo(), listing: towelListing(), mode: "reviewed", humanReviewed: true, marketingImage };
  assert.throws(() => createExport(value), e => e.code === "IMAGE_REVIEW_REQUIRED");
  const draft = createExport({ ...value, mode: "draft" });
  assert.doesNotMatch(JSON.stringify(draft), /should-not-export|base64/);
  assert.equal(createExport({ ...value, marketingImage: { ...marketingImage, humanReviewed: true } }).marketingImage.humanReviewed, true);
});
test("scene suggestions change with category and never lock all products to a desk", () => {
  assert.match(sceneSuggestions("厨房纺织品")[0], /厨房/);
  assert.match(sceneSuggestions("宠物用品")[0], /宠物/);
  assert.match(sceneSuggestions("旅行用品")[0], /出行/);
  assert.match(sceneSuggestions("家居收纳")[0], /办公桌/);
  assert.doesNotMatch(sceneSuggestions("其他")[0], /办公桌/);
});
