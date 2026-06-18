import { constants as fsConstants } from "node:fs";
import { access, rename } from "node:fs/promises";
import { join } from "node:path";
import { evaluateBuildGuard, formatBuildGuardMessage } from "./build-guard.mjs";

export const localBuildOutputDirName = ".next";
export const staleBuildOutputPrefix = ".next-stale-";

export function formatRecoveryTimestamp(date = new Date()) {
  return date
    .toISOString()
    .replace("T", "-")
    .replace("Z", "")
    .replace(/[:.]/g, "-");
}

export function buildRecoveryDirectoryName(date = new Date(), attempt = 0) {
  const base = `${staleBuildOutputPrefix}${formatRecoveryTimestamp(date)}`;
  return attempt > 0 ? `${base}-${attempt + 1}` : base;
}

export async function recoverLocalBuildState({
  workspaceRoot,
  outputDirName = localBuildOutputDirName,
  now = new Date(),
  allowWhileServing = false,
  pathExists = defaultPathExists,
  renamePath = rename,
  evaluateGuard = evaluateBuildGuard
}) {
  const guardReport = await evaluateGuard();

  if (guardReport.blocked && !allowWhileServing) {
    return {
      ok: false,
      status: "blocked",
      outputDirName,
      workspaceRoot,
      guardReport
    };
  }

  const outputPath = join(workspaceRoot, outputDirName);
  const outputExists = await pathExists(outputPath);

  if (!outputExists) {
    return {
      ok: true,
      status: "noop",
      outputDirName,
      workspaceRoot
    };
  }

  const targetDirName = await findAvailableRecoveryDirectoryName({
    workspaceRoot,
    now,
    pathExists
  });
  const targetPath = join(workspaceRoot, targetDirName);

  await renamePath(outputPath, targetPath);

  return {
    ok: true,
    status: "moved",
    outputDirName,
    outputPath,
    targetDirName,
    targetPath,
    workspaceRoot,
    forced: allowWhileServing && guardReport.blocked,
    guardReport
  };
}

export function formatLocalRecoveryMessage(result) {
  if (result.status === "blocked") {
    return [
      formatBuildGuardMessage(result.guardReport),
      "",
      "Local recovery is paused until the HackMatch dev server stops using this workspace.",
      "After stopping `npm run dev`, run `npm run recover:local` again.",
      "If you intentionally need to recover while the server is still live, use `HACKMATCH_RECOVERY_FORCE=1 npm run recover:local`."
    ].join("\n");
  }

  if (result.status === "noop") {
    return `No ${result.outputDirName} directory was found. Nothing needed recovery.`;
  }

  const lines = [
    `Moved ${result.outputDirName} to ${result.targetDirName}.`,
    "You can now restart `npm run dev` or rerun `npm run build` with a clean local output state."
  ];

  if (result.forced) {
    lines.push("This recovery ran with `HACKMATCH_RECOVERY_FORCE=1` while a HackMatch server was still detected.");
  }

  return lines.join("\n");
}

export async function findAvailableRecoveryDirectoryName({
  workspaceRoot,
  now = new Date(),
  pathExists = defaultPathExists
}) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = buildRecoveryDirectoryName(now, attempt);
    const candidatePath = join(workspaceRoot, candidate);

    if (!await pathExists(candidatePath)) {
      return candidate;
    }
  }

  throw new Error("Unable to find an available .next recovery directory name.");
}

async function defaultPathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}
