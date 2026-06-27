import type { DeploymentReadiness } from "@/lib/deployment-readiness";
import type { LaunchChecklist } from "@/lib/launch-checklist";
import type { RemoteCutoverChecklist } from "@/lib/remote-cutover-checklist";

export type LaunchRehearsalStep = {
  label: string;
  status: "ready" | "review";
  detail: string;
  action: string;
};

export type LaunchRehearsalPlan = {
  status: "ready" | "review";
  title: string;
  detail: string;
  steps: LaunchRehearsalStep[];
};

export function buildLaunchRehearsalPlan({
  deployment,
  checklist,
  remoteCutover,
  hasFinalRun,
  hasBackupExport
}: {
  deployment: DeploymentReadiness;
  checklist: LaunchChecklist;
  remoteCutover: RemoteCutoverChecklist;
  hasFinalRun: boolean;
  hasBackupExport: boolean;
}): LaunchRehearsalPlan {
  const checklistReady = checklist.items.every((item) => item.status === "ready");
  const steps: LaunchRehearsalStep[] = [
    {
      label: "Freeze organizer-approved teams",
      status: hasFinalRun ? "ready" : "review",
      detail: hasFinalRun
        ? "A final saved run is selected for handoff."
        : "No final saved run is selected yet.",
      action: hasFinalRun
        ? "Keep the final marker unless a new deterministic run is approved."
        : "Open Team review, verify the run, and mark the selected saved run as final."
    },
    {
      label: "Export a local recovery point",
      status: hasBackupExport ? "ready" : "review",
      detail: hasBackupExport
        ? "Backup history shows at least one local workspace export."
        : "No backup export is recorded in the local audit history.",
      action: hasBackupExport
        ? "Download a fresh backup if participant or saved-run data changed since the last export."
        : "Open Settings and download a backup JSON before a serious rehearsal."
    },
    {
      label: "Clear launch checklist blockers",
      status: checklistReady ? "ready" : "review",
      detail: checklistReady
        ? "All launch checklist items are ready."
        : "One or more launch checklist items still need organizer review.",
      action: checklistReady
        ? "Run the final smoke check from the local operator playbook."
        : "Review the dashboard checklist and resolve the remaining review items."
    },
    {
      label: "Confirm remote cutover posture",
      status: remoteCutover.status,
      detail: remoteCutover.detail,
      action: remoteCutover.status === "ready"
        ? "Proceed with the first remote rehearsal only after local backup and final run are confirmed."
        : "Keep the MVP in local mode until Supabase env, schema, RLS, and backup posture are reviewed."
    },
    {
      label: "Check deployment readiness",
      status: deployment.status === "ready" ? "ready" : "review",
      detail: deployment.detail,
      action: deployment.status === "ready"
        ? "Run the route smoke test against the intended server before sharing links."
        : "Resolve deployment readiness warnings before treating the rehearsal as launch-like."
    }
  ];
  const status = steps.every((step) => step.status === "ready") ? "ready" : "review";

  return {
    status,
    title: status === "ready" ? "Launch rehearsal is ready" : "Launch rehearsal needs review",
    detail: status === "ready"
      ? "The current workspace has the minimum operational signals for a launch-like rehearsal."
      : "Use this plan to turn the current MVP state into a repeatable launch rehearsal.",
    steps
  };
}
