# HackMatch AI

HackMatch AI is an MVP for deterministic hackathon team matching with transparent scoring and optional AI-style explanations. The matching algorithm assigns teams first; explanations are generated afterward and never decide team membership.

## What It Does

- Collects participant registration fields for roles, skills, interests, preferences, availability, and consent.
- Lets organizers edit participants and matching settings in browser-local MVP storage.
- Generates balanced teams with deterministic hard constraints and weighted soft constraints.
- Shows score breakdowns for every team.
- Exports generated teams to CSV.

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
3. Tune team size, constraints, and weights at `/admin/settings`.
4. Check generated assignments and warnings at `/admin/matching`.
5. Inspect score breakdowns and export edited results at `/admin/teams`.

The editable data is stored in browser `localStorage`, so it survives refreshes
on the same machine/browser. Use "Reset demo data" to return to the seed data.

Participant registrations receive an access token and redirect to `/participant/team?access=...`. Admins can open or copy each participant's team link from `/admin/participants`. Manual lookup by name, email, or ID remains available for local testing.

Generated teams can be saved from `/admin/teams` as frozen match runs. A saved run stores the exact teams, scores, warnings, explanations, settings snapshot, and participant snapshot used for export, even if editable data changes later.

Participants can be assigned to cohorts such as `General`, `May Hackathon`, or `Workshop A`. Admin matching and team exports use the active cohort, so separate events or groups can be generated independently without changing older saved runs.

## Supabase Persistence

HackMatch AI can run fully offline with browser `localStorage`. To persist editable participants and settings in Supabase, create the tables from `lib/schema.sql`, then add these values to `.env.local`:

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

Tests cover determinism, uniqueness, team sizes, blocked teammates, consent exclusion, advanced distribution, beginner-only penalties, score breakdowns, and CSV export.

## Main Routes

- `/`
- `/participant/register`
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
