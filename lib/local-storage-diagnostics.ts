export type LocalStorageDiagnosticStatus = "healthy" | "review" | "blocked";

export type LocalStorageDiagnosticItem = {
  label: string;
  status: LocalStorageDiagnosticStatus;
  detail: string;
};

export type LocalStorageDiagnostics = {
  status: LocalStorageDiagnosticStatus;
  isAvailable: boolean;
  totalBytes: number;
  keyCount: number;
  largestKey?: string;
  largestKeyBytes: number;
  items: LocalStorageDiagnosticItem[];
};

export const hackMatchStorageKeys = [
  "hackmatch.participants.v1",
  "hackmatch.settings.v1",
  "hackmatch.savedMatchRuns.v1",
  "hackmatch.activeCohort.v1",
  "hackmatch.archivedCohorts.v1",
  "hackmatch.currentParticipant.v1",
  "hackmatch.teamReviewChecklist.v1",
  "hackmatch.adminAuditHistory.v1"
];

const reviewByteThreshold = 2_000_000;
const blockedByteThreshold = 4_500_000;

export function readLocalStorageDiagnostics(): LocalStorageDiagnostics {
  if (typeof window === "undefined") {
    return buildLocalStorageDiagnostics({
      available: false,
      entries: [],
      error: "Browser storage is only available after the app loads in a browser."
    });
  }

  try {
    const probeKey = "hackmatch.storageProbe";
    window.localStorage.setItem(probeKey, "ok");
    window.localStorage.removeItem(probeKey);
    const entries = hackMatchStorageKeys.map((key) => [key, window.localStorage.getItem(key)] as const);
    return buildLocalStorageDiagnostics({ available: true, entries });
  } catch {
    return buildLocalStorageDiagnostics({
      available: false,
      entries: [],
      error: "Browser localStorage is blocked or unavailable in this session."
    });
  }
}

export function buildLocalStorageDiagnostics({
  available,
  entries,
  error
}: {
  available: boolean;
  entries: Array<readonly [string, string | null]>;
  error?: string;
}): LocalStorageDiagnostics {
  if (!available) {
    return {
      status: "blocked",
      isAvailable: false,
      totalBytes: 0,
      keyCount: 0,
      largestKeyBytes: 0,
      items: [
        {
          label: "Storage availability",
          status: "blocked",
          detail: error ?? "Browser localStorage is unavailable."
        }
      ]
    };
  }

  const storedEntries = entries
    .filter((entry): entry is readonly [string, string] => entry[1] !== null)
    .map(([key, value]) => ({
      key,
      bytes: estimateUtf16Bytes(value)
    }));
  const totalBytes = storedEntries.reduce((sum, entry) => sum + entry.bytes, 0);
  const largest = storedEntries.reduce<{ key?: string; bytes: number }>(
    (largestEntry, entry) => entry.bytes > largestEntry.bytes ? { key: entry.key, bytes: entry.bytes } : largestEntry,
    { bytes: 0 }
  );
  const missingRequiredKeys = ["hackmatch.participants.v1", "hackmatch.settings.v1"].filter(
    (key) => !storedEntries.some((entry) => entry.key === key)
  );

  const items: LocalStorageDiagnosticItem[] = [
    {
      label: "Storage availability",
      status: "healthy",
      detail: "Browser localStorage accepts HackMatch reads and writes in this session."
    },
    {
      label: "Stored MVP surfaces",
      status: missingRequiredKeys.length ? "review" : "healthy",
      detail: missingRequiredKeys.length
        ? `Missing ${missingRequiredKeys.length} core key(s); the app may still be bootstrapping demo data.`
        : `${storedEntries.length} HackMatch storage key(s) are present.`
    },
    {
      label: "Storage footprint",
      status: totalBytes >= blockedByteThreshold ? "blocked" : totalBytes >= reviewByteThreshold ? "review" : "healthy",
      detail: `${formatBytes(totalBytes)} used by HackMatch local data.`
    }
  ];

  if (largest.key) {
    items.push({
      label: "Largest data surface",
      status: largest.bytes >= reviewByteThreshold ? "review" : "healthy",
      detail: `${largest.key} is the largest key at ${formatBytes(largest.bytes)}.`
    });
  }

  return {
    status: summarizeStatus(items),
    isAvailable: true,
    totalBytes,
    keyCount: storedEntries.length,
    largestKey: largest.key,
    largestKeyBytes: largest.bytes,
    items
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function estimateUtf16Bytes(value: string): number {
  return value.length * 2;
}

function summarizeStatus(items: LocalStorageDiagnosticItem[]): LocalStorageDiagnosticStatus {
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => item.status === "review")) return "review";
  return "healthy";
}
