export type BuildGuardStatus = number | "ERR";

export type BuildGuardTargetResult = {
  baseUrl: string;
  detected: boolean;
  reachable: boolean;
  status: BuildGuardStatus;
  error?: string;
};

export type BuildGuardReport = {
  blocked: boolean;
  matches: BuildGuardTargetResult[];
  results: BuildGuardTargetResult[];
  targets: string[];
};

export type BuildGuardFetchResponse = {
  status: number;
  text(): Promise<string>;
  headers?: {
    get(name: string): string | null;
  };
};

export type BuildGuardFetch = (
  input: string,
  init?: {
    signal?: AbortSignal;
    headers?: Record<string, string>;
    timeoutMs?: number;
  }
) => Promise<BuildGuardFetchResponse>;

export const defaultBuildGuardTargets: string[];

export function normalizeBuildGuardBaseUrl(value: string): string;
export function parseBuildGuardTargets(value?: string): string[];
export function getBuildGuardTargets(env?: Record<string, string | undefined>): string[];
export function isHackMatchLocalHtml(html: string): boolean;
export function hasHackMatchSecurityHeaders(headers?: { get(name: string): string | null } | null): boolean;
export function isHackMatchLocalResponse(
  html: string,
  headers?: { get(name: string): string | null } | null
): boolean;

export function evaluateBuildGuard(options?: {
  fetchImpl?: BuildGuardFetch;
  targets?: string[];
  timeoutMs?: number;
}): Promise<BuildGuardReport>;

export function formatBuildGuardMessage(report: BuildGuardReport): string;
