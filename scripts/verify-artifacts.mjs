import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const env = await readFile(".env.local", "utf8").catch(() => "");
const key = env.match(/^TOKEN_PLAN_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
const files = [];
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await visit(path); else files.push(path);
  }
}
await visit("dist");
const tracked = execFileSync("git", ["-c", "safe.directory=" + process.cwd().replaceAll("\\", "/"), "ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
assert.ok(!tracked.includes(".env.local"), "Local secret file must not be tracked");
for (const path of [...new Set([...files, ...tracked])]) {
  const data = await readFile(path);
  if (key) assert.equal(data.includes(Buffer.from(key)), false, "Credential found in artifact: " + path);
  if (path.startsWith("dist") && /\.(?:js|mjs|html)$/.test(path)) assert.doesNotMatch(data.toString(), /sk-sp-[A-Za-z0-9._-]{20,}/, "Credential-shaped value in build");
}
const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
assert.equal(typeof worker.fetch, "function");
console.log(JSON.stringify({ checkedBuildFiles: files.length, checkedTrackedFiles: tracked.length, actualKeyAvailableForComparison: !!key, noPlaintextCredentialFound: true, workerFetchExport: true }));
