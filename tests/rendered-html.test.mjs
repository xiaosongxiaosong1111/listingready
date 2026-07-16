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

test("renders the ListingReady organizer demo with real photos", async () => {
  const response = await render();
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>ListingReady/);
  assert.match(html, /小宋1021队/);
  assert.match(html, /Amazon 美国站/);
  assert.match(html, /窄型抽屉收纳盒/);
  assert.match(html, /Slim Desk Drawer Organizer/);
  assert.match(html, /\/product\/scene-horizontal\.jpg/);
  assert.match(html, /\/product\/scene-stacked\.jpg/);
  assert.match(html, /\/product\/scene-drawers-open\.jpg/);
  assert.match(html, /真实照片[\s\S]*草稿[\s\S]*禁止直接发布/);
  assert.match(html, /参数待确认/);
  assert.match(html, /生成上新包/);
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

  assert.match(page, /商品信息/);
  assert.match(page, /发布前质检/);
  assert.match(page, /下载 JSON/);
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
