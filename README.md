# HackMatch AI

HackMatch AI is an MVP for deterministic hackathon team matching with transparent scoring and optional AI-style explanations. The matching algorithm assigns teams first; explanations are generated afterward and never decide team membership.

## What It Does

- Collects participant registration fields for roles, skills, interests, preferences, availability, and consent.
- Lets organizers edit participants and matching settings in browser-local MVP storage.
- Supports cohorts so separate hackathon groups can be matched independently.
- Generates balanced teams with deterministic hard constraints and weighted soft constraints.
- Shows score breakdowns for every team.
- Provides matching settings presets and health checks before generation.
- Lets organizers lock live teams so their membership is preserved during later regeneration.
- Saves generated match runs as frozen snapshots for later review.
- Exports and imports participant CSV files, and exports generated teams to CSV.

## Deterministic Matching

The core matcher lives in `lib/matching`. It avoids unseeded randomness and AI-based assignment. Given the same participants and settings, `generateTeams()` returns the same team assignments.

The algorithm:

1. Validates participants.
2. Normalizes roles, skills, interests, and tools.
3. Excludes participants without matching consent.
4. Respects blocked teammate constraints and locked teams.
5. Seeds teams with scarce or high-impact roles.
6. Distributes advanced participants where possible.
7. Fills teams using deterministic contribution scoring.
8. Scores each team from 0 to 100.
9. Attempts deterministic pairwise swaps to improve scores.
10. Returns teams, score breakdowns, warnings, explanations, and unassigned participants.

## Team Scoring

Each team receives a weighted score using:

- Role coverage
- Skill coverage
- Experience balance
- Interest alignment
- Availability compatibility
- Preference satisfaction
- Constraint penalties

Weights are configured in `defaultMatchingSettings` and can be persisted using the PostgreSQL-compatible schema in `lib/schema.sql`.

## AI Explanations

The MVP includes `lib/matching/explanations.ts`, a deterministic fallback explanation generator. It produces team summaries, strengths, weaknesses, suggested project direction, internal role suggestions, and warnings.

The app also includes an env-gated explanation API at `/api/explanations`. If `OPENAI_API_KEY` is configured, it can ask OpenAI to explain the already-generated teams. If no key is configured, it automatically returns deterministic fallback explanations.

AI never assigns teams. The deterministic matcher generates assignments and score breakdowns first; the AI layer only explains that output.

AI responses are validated before display. Unknown teams are ignored, incomplete explanations fall back to deterministic text, and suggested internal roles must map to participants already assigned by the algorithm.

To enable OpenAI-backed explanations:

```bash
cp .env.example .env.local
```

Then set:

```bash
OPENAI_API_KEY=your_api_key
OPENAI_EXPLANATION_MODEL=gpt-5.2
```

## Run The Project

Prerequisites:

- Node.js 20 or newer
- npm 10 or newer

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production check:

```bash
npm run build
```

Deployment notes live in `DEPLOYMENT.md`.

## Viability Workflow

Use the MVP to test real matching behavior before adding Supabase persistence:

1. Add participants at `/participant/register`.
2. Edit or delete active participants at `/admin/participants`.
3. Select or create the active cohort at `/admin/matching` or `/admin/participants`.
4. Tune team size, constraints, presets, and weights at `/admin/settings`.
5. Check generated assignments and warnings at `/admin/matching`.
6. Inspect score breakdowns, save match runs, and export results at `/admin/teams`.

The editable data is stored in browser `localStorage`, so it survives refreshes
on the same machine/browser. Use "Reset demo data" to return to the seed data.

Organizers can export all participants or the current filtered participant view as CSV from `/admin/participants`. The same page can import participant CSVs, preview new/updated/skipped/invalid rows, inspect row-level warnings, skip or update duplicates, and default missing cohort values to the active cohort.

Participant registrations include quality checks for required identity, role, availability, consent, duplicate emails, URL formatting, skills, and interests. Successful registrations receive an access token and redirect to `/participant/confirmation?access=...`, where participants can copy their team access link and review saved profile details. Admins can open, copy, regenerate, bulk-copy, or export participant team links from `/admin/participants`. Manual lookup by name, email, or ID remains available for local testing.

Generated teams can be saved from `/admin/teams` as frozen match runs. A saved run stores the exact teams, scores, warnings, explanations, settings snapshot, and participant snapshot used for export, even if editable data changes later.

Saved runs can be renamed, duplicated, restored as the live baseline, compared against current live teams, or deleted with confirmation. Restoring a saved run brings back its participant snapshot, settings snapshot, and cohort as the current editable baseline.

Live teams can also be locked from `/admin/teams`. Locked teams are passed back into the deterministic matcher through explicit settings, so their participants stay together while the rest of the cohort can be regenerated and optimized.

Participants can be assigned to cohorts such as `General`, `May Hackathon`, or `Workshop A`. Admin matching and team exports use the active cohort, so separate events or groups can be generated independently without changing older saved runs.

## Organizer Workflow

For a realistic event rehearsal:

1. Create or select a cohort for the event.
2. Register participants manually or import them from CSV.
3. Use participant search and filters to inspect role, experience, consent, and cohort coverage.
4. Tune matching settings and generate deterministic teams for the active cohort.
5. Review score breakdowns, warnings, internal role suggestions, and explanations.
6. Save the final match run before making later participant edits.
7. Export teams or participant records as CSV for sharing and operational follow-up.

The settings page includes presets for balanced, skill-heavy, beginner-friendly, and strict-constraint matching. It also reports settings health for the active cohort, including impossible team size combinations, negative weights, participant capacity issues, and missing role coverage signals.

The matching page includes an event setup panel for cohort name, preset, desired/min/max team size, and a shareable registration link. This gives organizers a fast path from event setup to participant intake without changing the deterministic matching rules.

## Supabase Persistence

HackMatch AI can run fully offline with browser `localStorage`. Admin pages show whether the app is using local storage or Supabase so organizers know where edits are being kept.

The current Supabase adapter is plug-ready for editable participants and matching settings. Participant cohorts and access tokens are included in the schema and adapter. Saved match runs remain local browser snapshots in the MVP, while `lib/schema.sql` includes a cohort-aware `match_runs` table for a later remote persistence pass.

To persist editable participants and settings in Supabase, create the tables from `lib/schema.sql`, then add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

When those variables are present, the app loads participants and matching settings from Supabase and mirrors successful edits back to localStorage as a fallback. If Supabase is unavailable, the UI continues with local browser storage and shows a warning in the admin dashboard.

## Test The Project

```bash
npm run test
npm run typecheck
```

Tests cover determinism, uniqueness, team sizes, blocked teammates, consent exclusion, advanced distribution, beginner-only penalties, locked teams, score breakdowns, CSV export, access link export, CSV import duplicate handling, CSV import validation, participant registration validation, settings presets, and settings validation.

## Main Routes

- `/`
- `/participant/register`
- `/participant/confirmation`
- `/participant/team`
- `/admin`
- `/admin/participants`
- `/admin/matching`
- `/admin/teams`
- `/admin/settings`
- `/api/teams.csv`

## Assumptions

- The MVP falls back to browser-local demo data when Supabase environment variables are not configured.
- shadcn/ui is represented by local Tailwind UI primitives so the app can run immediately.
- Registration and admin edits can persist through Supabase when public project credentials are configured.
