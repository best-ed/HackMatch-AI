import { readFile } from "node:fs/promises";

const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL || "http://localhost:3000");
const routes = JSON.parse(
  await readFile(new URL("../smoke-routes.json", import.meta.url), "utf8")
);

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 12000);

const results = [];

for (const route of routes) {
  const url = `${baseUrl}${route}`;
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(url, timeoutMs);
    results.push({
      route,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    results.push({
      route,
      ok: false,
      status: "ERR",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

const failures = results.filter((result) => !result.ok);

console.log(`HackMatch AI smoke test: ${baseUrl}`);
for (const result of results) {
  const status = result.ok ? "PASS" : "FAIL";
  const detail = result.error ? ` - ${result.error}` : "";
  console.log(`${status} ${result.status} ${result.route} (${result.durationMs}ms)${detail}`);
}

if (failures.length > 0) {
  console.error(`Smoke test failed for ${failures.length} route(s).`);
  process.exit(1);
}

console.log("Smoke test passed.");

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "hackmatch-smoke-test"
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
