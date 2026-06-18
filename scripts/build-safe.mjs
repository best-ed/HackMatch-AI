import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateBuildGuard,
  formatBuildGuardMessage
} from "./build-guard.mjs";

const skipGuard = process.env.HACKMATCH_SKIP_BUILD_GUARD === "1";

if (!skipGuard) {
  const report = await evaluateBuildGuard();
  if (report.blocked) {
    console.error(formatBuildGuardMessage(report));
    process.exit(1);
  }
}

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = resolve(workspaceRoot, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "build"], {
  cwd: workspaceRoot,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
