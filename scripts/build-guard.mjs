import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export const defaultBuildGuardTargets = [
  "http://localhost:3000",
  "http://localhost:3001"
];
export const defaultBuildGuardPaths = [
  "/admin/login",
  "/participant",
  "/"
];

export function normalizeBuildGuardBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

export function parseBuildGuardTargets(value) {
  const raw = value?.trim();
  if (!raw) return [...defaultBuildGuardTargets];

  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((target) => target.trim())
        .filter(Boolean)
        .map(normalizeBuildGuardBaseUrl)
    )
  );
}

export function getBuildGuardTargets(env = process.env) {
  return parseBuildGuardTargets(env.HACKMATCH_BUILD_GUARD_URLS);
}

export function isHackMatchLocalHtml(html) {
  return html.toLowerCase().includes("hackmatch ai");
}

export function hasHackMatchSecurityHeaders(headers) {
  if (!headers?.get) return false;

  const frameOptions = headers.get("x-frame-options");
  const referrerPolicy = headers.get("referrer-policy");
  const permissionsPolicy = headers.get("permissions-policy");

  return frameOptions === "DENY" &&
    referrerPolicy === "strict-origin-when-cross-origin" &&
    typeof permissionsPolicy === "string" &&
    permissionsPolicy.includes("camera=()") &&
    permissionsPolicy.includes("microphone=()");
}

export function isHackMatchLocalResponse(html, headers) {
  return isHackMatchLocalHtml(html) || hasHackMatchSecurityHeaders(headers);
}

export async function evaluateBuildGuard({
  fetchImpl = defaultBuildGuardFetch,
  targets = getBuildGuardTargets(),
  timeoutMs = 4000
} = {}) {
  const results = [];

  for (const target of targets) {
    results.push(await inspectLocalTarget(target, { fetchImpl, timeoutMs }));
  }

  const matches = results.filter((result) => result.detected);

  return {
    blocked: matches.length > 0,
    matches,
    results,
    targets
  };
}

export function formatBuildGuardMessage(report) {
  const lines = [
    "HackMatch build guard blocked this local build.",
    "",
    "A live HackMatch dev server appears to be serving from this workspace:",
    ...report.matches.map((match) => `- ${match.baseUrl} (${match.status})`),
    "",
    "Stop `npm run dev` before running `npm run build` in the same workspace.",
    "If you intentionally need to bypass this local guard, use `HACKMATCH_SKIP_BUILD_GUARD=1 npm run build`."
  ];

  return lines.join("\n");
}

async function inspectLocalTarget(baseUrl, { fetchImpl, timeoutMs }) {
  const normalizedBaseUrl = normalizeBuildGuardBaseUrl(baseUrl);
  let lastError = "No response received.";

  for (const path of defaultBuildGuardPaths) {
    try {
      const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
        headers: {
          "user-agent": "hackmatch-build-guard"
        },
        timeoutMs
      });
      const html = await response.text();

      if (isHackMatchLocalResponse(html, response.headers)) {
        return {
          baseUrl: normalizedBaseUrl,
          detected: true,
          reachable: true,
          status: response.status
        };
      }

      lastError = `Responded on ${path} without HackMatch markers.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    baseUrl: normalizedBaseUrl,
    detected: false,
    reachable: false,
    error: lastError,
    status: "ERR"
  };
}

async function defaultBuildGuardFetch(input, init = {}) {
  const url = new URL(input);
  const requestImpl = url.protocol === "https:" ? httpsRequest : httpRequest;

  return await new Promise((resolve, reject) => {
    const request = requestImpl(url, {
      method: "GET",
      headers: init.headers
    });

    const timeoutMs = typeof init.timeoutMs === "number" ? init.timeoutMs : 4000;
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("This operation was aborted"));
    });

    request.on("response", (response) => {
      response.setEncoding("utf8");

      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          status: response.statusCode ?? 0,
          async text() {
            return body;
          },
          headers: createBuildGuardHeaders(response.headers)
        });
      });
    });

    request.on("error", reject);
    request.end();
  });
}

function createBuildGuardHeaders(rawHeaders) {
  const headerMap = new Map();

  for (const [name, value] of Object.entries(rawHeaders ?? {})) {
    if (Array.isArray(value)) {
      headerMap.set(name.toLowerCase(), value.join(", "));
      continue;
    }

    if (typeof value === "string") {
      headerMap.set(name.toLowerCase(), value);
    }
  }

  return {
    get(name) {
      return headerMap.get(name.toLowerCase()) ?? null;
    }
  };
}
