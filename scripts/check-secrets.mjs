// Local-only release scan. Never prints a secret, matched text, or file contents.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
const key = process.env.TOKEN_PLAN_API_KEY;
if (!key) throw new Error("Load the private local environment for exact-key scanning; no API request is made.");
const safe = "safe.directory=" + process.cwd().replaceAll("\\", "/");
function git(args, input) {
  const result = spawnSync("git", ["-c", safe, ...args], { input, maxBuffer: 128 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("Local Git scan failed; no release approval produced.");
  return result.stdout;
}
const source = git(["ls-files", "-co", "--exclude-standard", "-z"]).toString().split("\0").filter(Boolean);
const build = existsSync("dist") ? readdirSync("dist", { recursive: true }).map(p => "dist/" + p).filter(p => statSync(p).isFile()) : [];
const files = [...new Set([...source, ...build])].filter(p => existsSync(p) && statSync(p).isFile());
const containsSecret = bytes => bytes.includes(Buffer.from(key)) || /sk-sp-[A-Za-z0-9._-]{30,}/.test(bytes.toString("utf8"));
const fileMatches = files.filter(p => containsSecret(readFileSync(p))).length;
// Scan all reachable object bodies through stdin, with no secret in arguments.
const objects = git(["rev-list", "--objects", "--all"]).toString().trim().split("\n").filter(Boolean).map(line => line.split(" ")[0]);
const history = git(["cat-file", "--batch"], objects.join("\n") + "\n");
const historyMatch = containsSecret(history);
console.log(JSON.stringify({ currentFiles: files.length, reachableObjects: objects.length, currentSecretMatches: fileMatches, historySecretMatch: historyMatch, modelCalls: 0 }));
if (fileMatches || historyMatch) process.exitCode = 1;
