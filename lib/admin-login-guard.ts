const adminLoginMaxFailures = 5;
const adminLoginCooldownSeconds = 60;

type AdminLoginAttemptRecord = {
  failureCount: number;
  blockedUntilMs?: number;
};

export type AdminLoginGuardState = {
  blocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
};

const attemptStore = new Map<string, AdminLoginAttemptRecord>();

export function describeAdminLoginGuard(
  key: string,
  now: number | Date = Date.now()
): AdminLoginGuardState {
  const state = normalizedRecord(key, now);

  if (state.blockedUntilMs) {
    return {
      blocked: true,
      remainingAttempts: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntilMs - resolveTimestamp(now)) / 1000))
    };
  }

  return {
    blocked: false,
    remainingAttempts: Math.max(0, adminLoginMaxFailures - state.failureCount),
    retryAfterSeconds: 0
  };
}

export function recordFailedAdminLogin(
  key: string,
  now: number | Date = Date.now()
): AdminLoginGuardState {
  const timestamp = resolveTimestamp(now);
  const state = normalizedRecord(key, timestamp);

  if (state.blockedUntilMs && state.blockedUntilMs > timestamp) {
    attemptStore.set(key, state);
    return describeAdminLoginGuard(key, timestamp);
  }

  const nextFailureCount = state.failureCount + 1;
  if (nextFailureCount >= adminLoginMaxFailures) {
    attemptStore.set(key, {
      failureCount: 0,
      blockedUntilMs: timestamp + adminLoginCooldownSeconds * 1000
    });
    return describeAdminLoginGuard(key, timestamp);
  }

  attemptStore.set(key, { failureCount: nextFailureCount });
  return describeAdminLoginGuard(key, timestamp);
}

export function clearAdminLoginGuard(key: string) {
  attemptStore.delete(key);
}

export function adminLoginAttemptKey(input: {
  forwardedFor?: string | null;
  realIp?: string | null;
  userAgent?: string | null;
}) {
  const clientIp = input.forwardedFor?.split(",")[0]?.trim() || input.realIp?.trim() || "local";
  const userAgent = input.userAgent?.trim() || "unknown";
  return `${clientIp}::${userAgent}`;
}

export function adminLoginCooldownWindowSeconds() {
  return adminLoginCooldownSeconds;
}

export function adminLoginMaxAllowedFailures() {
  return adminLoginMaxFailures;
}

export function resetAdminLoginGuardStore() {
  attemptStore.clear();
}

function normalizedRecord(key: string, now: number | Date) {
  const timestamp = resolveTimestamp(now);
  const existing = attemptStore.get(key);
  if (!existing) {
    return { failureCount: 0 } satisfies AdminLoginAttemptRecord;
  }

  if (existing.blockedUntilMs && existing.blockedUntilMs <= timestamp) {
    attemptStore.delete(key);
    return { failureCount: 0 } satisfies AdminLoginAttemptRecord;
  }

  return existing;
}

function resolveTimestamp(value: number | Date) {
  return value instanceof Date ? value.getTime() : value;
}
