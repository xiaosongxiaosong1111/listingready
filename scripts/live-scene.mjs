// One authorized reference-edit test, no retries. Never part of default tests.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { organizerDemo } from "../lib/demos.ts";
import { generateScene } from "../lib/generate-scene.ts";
if (process.env.RUN_LIVE_TESTS !== "1" || process.env.CONFIRM_REFERENCE_UPLOAD !== "1") throw new Error("Explicit API and reference-upload authorization are required.");
const model = process.env.IMAGE_TEST_MODEL ?? "qwen-image-2.0-pro";
const referenceImage = "data:image/jpeg;base64," + (await readFile("public/product/scene-horizontal.jpg")).toString("base64");
const stem = `outputs/scene-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir("outputs", { recursive: true });
let result;
try {
  result = await generateScene({ profile: organizerDemo(), referenceImage, referenceConfirmed: true, scene: "保持原有置物架与抽屉横向摆放，仅让远处背景更整洁，柔和自然光", kind: "lifestyle" }, { apiKey: process.env.TOKEN_PLAN_API_KEY, baseUrl: process.env.TOKEN_PLAN_BASE_URL, model });
} catch (e) {
  const receipt = { testedAt: new Date().toISOString(), model, code: e?.code ?? "FAILED", status: e?.status ?? null, outcome: "stopped_without_retry" };
  await writeFile(stem + ".json", JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt)); process.exit(1);
}
await writeFile(stem + ".json", JSON.stringify({ result, quality: "pending_visual_review", referencePath: "public/product/scene-horizontal.jpg" }, null, 2));
console.log(JSON.stringify({ model: result.model, durationMs: result.durationMs, promptVersion: result.promptVersion, receipt: stem + ".json", quality: "pending_visual_review" }));
// Backup the already-returned result, never attach the API key to the image host.
const response = await fetch(result.url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
if (!response.ok || !response.headers.get("content-type")?.includes("image/png")) throw new Error("Image backup failed; receipt retained, do not generate again.");
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length > 12_000_000 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error("Unexpected image result; receipt retained.");
await writeFile(stem + ".png", bytes);
console.log(JSON.stringify({ backup: resolve(stem + ".png"), bytes: bytes.length }));
