import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const url = "http://localhost:3000/";

function fail(message) {
  console.error(`\n[ListingReady] ${message}\n`);
  process.exit(1);
}

function readApiKey() {
  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    fail("未找到 .env.local。请复制 .env.example，并在本地填写 TOKEN_PLAN_API_KEY。");
  }

  const line = content
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith("TOKEN_PLAN_API_KEY="));
  const value = line?.slice(line.indexOf("=") + 1).trim().replace(/^['\"]|['\"]$/g, "");

  if (!value || value === "replace-with-your-token-plan-key") {
    fail("TOKEN_PLAN_API_KEY 未填写。真实模式不会使用模拟数据，请先配置本地密钥。");
  }
}

function ensureNodeVersion() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    fail(`当前 Node.js 为 ${process.versions.node}，需要 22.13.0 或更高版本。`);
  }
}

function openBrowser(target) {
  const command =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", target]]
      : process.platform === "darwin"
        ? ["open", [target]]
        : ["xdg-open", [target]];

  const opener = spawn(command[0], command[1], {
    detached: true,
    stdio: "ignore",
  });
  opener.unref();
}

async function waitUntilReady(child) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      fail(`开发服务提前退出，退出码：${child.exitCode}。`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  fail("开发服务 60 秒内未就绪，请查看上方日志。");
}

ensureNodeVersion();
readApiKey();

console.log("\n[ListingReady] 正在启动真实模型模式。");
console.log("[ListingReady] 文案和场景图请求都会调用比赛 Token Plan，不提供离线模拟结果。\n");

const cli = path.join(root, "node_modules", "vinext", "dist", "cli.js");
const child = spawn(
  process.execPath,
  [cli, "dev", "--host", "127.0.0.1", "--port", "3000"],
  { cwd: root, env: process.env, stdio: "inherit" },
);

child.on("error", (error) => fail(`无法启动开发服务：${error.message}`));

await waitUntilReady(child);
console.log(`\n[ListingReady] 已就绪：${url}`);
openBrowser(url);

const exitCode = await new Promise((resolve) => child.once("exit", (code) => resolve(code ?? 0)));
process.exitCode = exitCode;
