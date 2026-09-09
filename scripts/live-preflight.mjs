// One tiny, explicitly authorized request. Never print keys or upstream bodies.
import { TOKEN_PLAN_ORIGIN } from "../lib/generate.ts";
if (process.env.RUN_LIVE_TESTS !== "1") throw new Error("Set RUN_LIVE_TESTS=1; this consumes model quota.");
if (!process.env.TOKEN_PLAN_API_KEY) throw new Error("Server key missing; no request sent.");
const response = await fetch(TOKEN_PLAN_ORIGIN + "/chat/completions", {
  method: "POST", redirect: "manual", signal: AbortSignal.timeout(45000),
  headers: { Authorization: `Bearer ${process.env.TOKEN_PLAN_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: process.env.TOKEN_PLAN_MODEL ?? "qwen3.6-flash", messages: [{ role: "user", content: "Reply OK only." }], max_tokens: 8, enable_thinking: false }),
});
const result = { status: response.status, usable: response.ok, stopModelCalls: !response.ok, testedAt: new Date().toISOString() };
await response.body?.cancel();
console.log(JSON.stringify(result));
if (!response.ok) process.exitCode = 1;
