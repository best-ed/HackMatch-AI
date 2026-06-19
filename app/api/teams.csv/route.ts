export function GET() {
  return new Response(
    [
      "HackMatch AI retired this legacy CSV route.",
      "Use /admin/teams to review export audit details and download team CSV output."
    ].join("\n"),
    {
      status: 410,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
        "x-hackmatch-route-status": "retired",
        "x-hackmatch-route-replacement": "/admin/teams"
      }
    }
  );
}
