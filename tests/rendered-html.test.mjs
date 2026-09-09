import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders a multi-category fact workspace without fabricated AI results", async () => {
  const response = await render();
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>ListingReady/);
  assert.match(html, /小宋1021队/);
  assert.match(html, /Amazon 美国站/);
  assert.match(html, /窄型抽屉收纳盒/);
  assert.match(html, /厨房毛巾/);
  assert.match(html, /填写我的商品/);
  assert.match(html, /\/product\/scene-horizontal\.jpg/);
  assert.match(html, /\/product\/scene-stacked\.jpg/);
  assert.match(html, /\/product\/scene-drawers-open\.jpg/);
  assert.match(html, /尚未接入 AI 图片识别/);
  assert.match(html, /等待生成/);
  assert.match(html, /生成英文 Listing/);
  assert.match(html, /75/);
  assert.match(html, /导出人工复核包/);
  assert.doesNotMatch(html, /手机支架|phone stand|tablet holder|4-12\.9/i);
  assert.doesNotMatch(html, /\bmock\b|\bplastic\b|PP 塑料|2 Drawers|Two pull-out drawers|two-drawer|2 个抽屉|24 × 17 × 14|演示图形|class="organizer"|\bmodular\b|\bstackable\b/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("keeps required project and photo assets", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /商品事实档案/);
  assert.match(page, /发布前风险检查/);
  assert.match(page, /下载草稿 JSON/);
  assert.match(layout, /lang="zh-CN"/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await Promise.all([
    access(new URL("public/favicon.svg", root)),
    access(new URL("public/product/scene-horizontal.jpg", root)),
    access(new URL("public/product/scene-stacked.jpg", root)),
    access(new URL("public/product/scene-drawers-open.jpg", root)),
  ]);
});

test("production Worker routes enforce export checks", async () => {
  const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
  const { organizerDemo } = await import("../lib/demos.ts");
  const { organizerListing } = await import("./fixtures.mjs");
  const response = await worker.fetch(new Request("http://localhost/api/export-listing", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: organizerDemo(), listing: organizerListing(), mode: "reviewed", humanReviewed: true }),
  }), { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "REVIEW_REQUIRED");
});

test("production image route rejects invalid HTTP requests before model access", async () => {
  const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
  const cases = [
    { headers: { "Content-Type": "text/plain" }, body: "{}", status: 415, code: "CONTENT_TYPE" },
    { headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" }, body: "{}", status: 403, code: "CROSS_ORIGIN" },
    { headers: { "Content-Type": "application/json" }, body: "not-json", status: 400, code: "INVALID_JSON" },
    { headers: { "Content-Type": "application/json" }, body: "x".repeat(1700001), status: 413, code: "BODY_TOO_LARGE" },
  ];
  for (const item of cases) {
    const response = await worker.fetch(new Request("http://localhost/api/generate-scene", { method: "POST", headers: item.headers, body: item.body }),
      { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, item.status);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal((await response.json()).code, item.code);
  }
});
