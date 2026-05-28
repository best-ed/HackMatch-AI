# HackMatch AI

HackMatch AI is an MVP for deterministic hackathon team matching with transparent scoring and optional AI-style explanations. The matching algorithm assigns teams first; explanations are generated afterward and never decide team membership.

## What It Does

- Collects participant registration fields for roles, skills, interests, preferences, availability, and consent.
- Lets organizers inspect participants and matching settings.
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

To add real AI explanations later, keep assignment logic unchanged. Add an adapter that accepts generated teams and score breakdowns, checks for provider environment variables, and falls back to the deterministic explanation module when no API key is configured.

## Run The Project

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

In this Codex workspace, a local `pnpm.exe` runner is included because system
`npm` was not available:

```bash
.\pnpm.exe install
.\pnpm.exe dev
```

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
- Registration is a UI surface only; wiring writes to Supabase/PostgreSQL is the next persistence step.
