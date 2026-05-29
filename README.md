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

## Viability Workflow

Use the MVP to test real matching behavior before adding Supabase persistence:

1. Add participants at `/participant/register`.
2. Edit or delete active participants at `/admin/participants`.
3. Tune team size, constraints, and weights at `/admin/settings`.
4. Check generated assignments and warnings at `/admin/matching`.
5. Inspect score breakdowns and export edited results at `/admin/teams`.

The editable data is stored in browser `localStorage`, so it survives refreshes
on the same machine/browser. Use "Reset demo data" to return to the seed data.

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

- The MVP uses in-memory demo data rather than live Supabase persistence.
- shadcn/ui is represented by local Tailwind UI primitives so the app can run immediately.
- Registration and admin edits persist in browser-local storage; wiring writes to Supabase/PostgreSQL is the next persistence step.
