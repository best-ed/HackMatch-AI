import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatLocalRecoveryMessage,
  recoverLocalBuildState
} from "./local-recovery.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowWhileServing = process.env.HACKMATCH_RECOVERY_FORCE === "1";

const result = await recoverLocalBuildState({
  workspaceRoot,
  allowWhileServing
});

const message = formatLocalRecoveryMessage(result);
if (result.ok) {
  console.log(message);
  process.exit(0);
}

console.error(message);
process.exit(1);
