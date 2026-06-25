import type { LocalStorageDiagnosticStatus } from "@/lib/local-storage-diagnostics";

export type LocalOpsPlaybookStep = {
  label: string;
  command: string;
  detail: string;
};

export function buildLocalOpsPlaybook({
  deploymentStatus,
  storageStatus
}: {
  deploymentStatus: "ready" | "review";
  storageStatus: LocalStorageDiagnosticStatus;
}): LocalOpsPlaybookStep[] {
  const steps: LocalOpsPlaybookStep[] = [];

  if (storageStatus !== "healthy") {
    steps.push({
      label: "Backup browser data",
      command: "Use /admin/settings -> Download backup JSON",
      detail: "Capture the current workspace before clearing demo data or testing riskier recoveries."
    });
  }

  steps.push({
    label: "Run guarded build",
    command: "npm run build",
    detail: "Confirms the repo still builds cleanly without stomping on a live localhost session."
  });

  if (deploymentStatus !== "ready") {
    steps.push({
      label: "Recover stale local output if needed",
      command: "npm run recover:local",
      detail: "Use this when localhost starts throwing 500s after overlapping build and dev output."
    });
  }

  steps.push({
    label: "Smoke test routes",
    command: "SMOKE_BASE_URL=http://localhost:3000 npm run smoke",
    detail: "Verifies the main public, participant, and admin routes after a successful local run."
  });

  return steps;
}
