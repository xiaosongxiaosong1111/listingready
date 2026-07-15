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

test("renders the ListingReady organizer demo", async () => {
  const response = await render();
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>ListingReady/);
  assert.match(html, /小宋1021队/);
  assert.match(html, /AI智能上新/);
  assert.match(html, /Amazon 美国站/);
  assert.match(html, /可堆叠抽屉式桌面收纳盒/);
  assert.match(html, /Stackable Desk Organizer/);
  assert.match(html, /未验证 Mock/);
  assert.match(html, /抽屉内部尺寸/);
  assert.match(html, /生成上新包/);
  assert.match(html, /演示模式/);
  assert.doesNotMatch(html, /手机支架|phone stand|tablet holder|4-12\.9/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("removes the disposable starter", async () => {
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
  await access(new URL("public/favicon.svg", root));
});
