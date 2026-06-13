import type { DeploymentReadiness } from "@/lib/deployment-readiness";
import type { TeamExportAuditStatus } from "@/lib/export-audit";
import type { SettingsHealth } from "@/lib/settings-guardrails";
import type { SupabaseReadiness } from "@/lib/supabase-readiness";

export type LaunchChecklistItem = {
  label: string;
  category: "security" | "data" | "matching" | "handoff" | "deployment";
  status: "ready" | "review";
  detail: string;
  actionLabel: string;
  href: string;
};

export type LaunchChecklist = {
  status: "ready" | "review";
  title: string;
  detail: string;
  readyCount: number;
  totalCount: number;
  items: LaunchChecklistItem[];
};

export function buildLaunchChecklist({
  deployment,
  supabase,
  hasFinalRun,
  hasSavedRun,
  hasRemoteSavedRunSupport,
  hasOpenAiKey,
  activeCohort = "General",
  matchableCount = 0,
  assignedCount = 0,
  settingsStatus = "healthy",
  exportStatus = "review",
  adminProtectionConfigured
}: {
  deployment: DeploymentReadiness;
  supabase: SupabaseReadiness;
  hasFinalRun: boolean;
  hasSavedRun: boolean;
  hasRemoteSavedRunSupport: boolean;
  hasOpenAiKey: boolean;
  activeCohort?: string;
  matchableCount?: number;
  assignedCount?: number;
  settingsStatus?: SettingsHealth["status"];
  exportStatus?: TeamExportAuditStatus;
  adminProtectionConfigured?: boolean;
}): LaunchChecklist {
  const assignmentReady = matchableCount > 0 && assignedCount === matchableCount;
  const settingsReady = settingsStatus === "healthy";
  const exportReady = exportStatus === "ready";
  const adminProtectionReady = adminProtectionConfigured === true;
  const items: LaunchChecklistItem[] = [
    {
      label: "Admin protection",
      category: "security",
      status: adminProtectionReady ? "ready" : "review",
      detail: adminProtectionReady
        ? "Admin passcode protection is configured for organizer routes."
        : adminProtectionConfigured === false
          ? "Configure ADMIN_PASSCODE and ADMIN_SESSION_SECRET before sharing deployed admin URLs."
          : "Review the admin access protection card before sharing deployed admin URLs.",
      actionLabel: "Review security",
      href: "/admin"
    },
    {
      label: "Active cohort",
      category: "data",
      status: matchableCount > 0 ? "ready" : "review",
      detail: matchableCount
        ? `${activeCohort} has ${matchableCount} matchable participant(s).`
        : `${activeCohort} has no matchable participants yet.`,
      actionLabel: "Open directory",
      href: "/admin/participants"
    },
    {
      label: "Settings viability",
      category: "matching",
      status: settingsReady ? "ready" : "review",
      detail: settingsReady
        ? "Matching settings are healthy for the active cohort."
        : "Resolve matching setting warnings or errors before launch handoff.",
      actionLabel: "Tune settings",
      href: "/admin/settings"
    },
    {
      label: "Assignment coverage",
      category: "matching",
      status: assignmentReady ? "ready" : "review",
      detail: assignmentReady
        ? `All ${assignedCount} matchable participant(s) are assigned.`
        : `${Math.max(0, matchableCount - assignedCount)} matchable participant(s) still need assignment review.`,
      actionLabel: "Review teams",
      href: "/admin/teams"
    },
    {
      label: "Export privacy",
      category: "handoff",
      status: exportReady ? "ready" : "review",
      detail: exportReady
        ? "Team export audit is clean for handoff."
        : exportStatus === "blocked"
          ? "Team export is blocked until there are exportable team rows."
          : "Review export privacy, contact sharing, and live-vs-saved scope before handoff.",
      actionLabel: "Audit export",
      href: "/admin/teams"
    },
    {
      label: "Production build",
      category: "deployment",
      status: deployment.status === "ready" ? "ready" : "review",
      detail:
        deployment.status === "ready"
          ? "Browser-visible preflight is ready; still run npm run build before launch."
          : "Resolve deployment preflight review items before launch.",
      actionLabel: "View preflight",
      href: "/admin"
    },
    {
      label: "Persistence decision",
      category: "deployment",
      status: supabase.status === "ready" || supabase.status === "local" ? "ready" : "review",
      detail:
        supabase.status === "ready"
          ? "Supabase env values look ready for remote editable data."
          : supabase.status === "local"
            ? "Local-storage mode is acceptable for demos, but not multi-admin production."
            : "Supabase env values are partially configured or malformed.",
      actionLabel: "Review persistence",
      href: "/admin"
    },
    {
      label: "Saved-run handoff",
      category: "handoff",
      status: hasSavedRun && hasFinalRun ? "ready" : "review",
      detail:
        hasSavedRun && hasFinalRun
          ? "A saved run is marked final for organizer handoff."
          : hasSavedRun
            ? "Mark one saved run as final before event handoff."
            : "Save a deterministic run before launch handoff.",
      actionLabel: "Open saved runs",
      href: "/admin/teams"
    },
    {
      label: "Remote saved-run support",
      category: "deployment",
      status: hasRemoteSavedRunSupport ? "ready" : "review",
      detail: hasRemoteSavedRunSupport
        ? "Schema and adapter support saved match runs remotely."
        : "Saved runs need remote persistence before multi-admin production.",
      actionLabel: "Review schema",
      href: "/admin"
    },
    {
      label: "AI explanation mode",
      category: "handoff",
      status: "ready",
      detail: hasOpenAiKey
        ? "OpenAI-backed explanations can be enabled; assignments remain deterministic."
        : "Deterministic fallback explanations are active without an API key.",
      actionLabel: "Review teams",
      href: "/admin/teams"
    }
  ];
  const readyCount = items.filter((item) => item.status === "ready").length;
  const totalCount = items.length;
  const status = readyCount === totalCount ? "ready" : "review";

  return {
    status,
    title: status === "ready" ? "Launch checklist is ready" : "Launch checklist needs review",
    detail:
      status === "ready"
        ? "All organizer handoff checks are ready. Run build, smoke, and final human review before launch."
        : "Work through the review items before treating this cohort as launch-ready.",
    readyCount,
    totalCount,
    items
  };
}
