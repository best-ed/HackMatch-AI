import type { LocalStorageDiagnostics, LocalStorageDiagnosticStatus } from "@/lib/local-storage-diagnostics";

export type LocalStoragePressureSummary = {
  status: LocalStorageDiagnosticStatus;
  title: string;
  detail: string;
};

export function summarizeLocalStoragePressure(
  diagnostics: LocalStorageDiagnostics
): LocalStoragePressureSummary {
  if (!diagnostics.isAvailable) {
    return {
      status: "blocked",
      title: "Browser storage is unavailable",
      detail: "HackMatch cannot rely on local browser persistence in this session until storage is restored."
    };
  }

  if (diagnostics.status === "blocked") {
    return {
      status: "blocked",
      title: "Workspace storage is close to unsafe levels",
      detail: `HackMatch is storing ${diagnostics.totalBytes} bytes locally. Export a backup or reset unused demo state before the browser starts dropping writes.`
    };
  }

  if (diagnostics.status === "review") {
    return {
      status: "review",
      title: "Workspace storage needs attention soon",
      detail: `Stored data is growing, and ${diagnostics.largestKey ?? "one local surface"} is now the heaviest browser payload.`
    };
  }

  return {
    status: "healthy",
    title: "Workspace storage looks healthy",
    detail: "Local browser persistence has enough headroom for normal MVP rehearsal flows."
  };
}
