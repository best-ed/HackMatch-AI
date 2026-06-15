# HackMatch AI

HackMatch AI is an MVP for deterministic hackathon team matching with transparent scoring and optional AI-style explanations. The matching algorithm assigns teams first; explanations are generated afterward and never decide team membership.

## What It Does

- Collects participant registration fields for roles, skills, interests, preferences, availability, and consent.
- Lets organizers edit participants and matching settings in browser-local MVP storage.
- Supports cohorts so separate hackathon groups can be matched independently.
- Generates balanced teams with deterministic hard constraints and weighted soft constraints.
- Shows score breakdowns for every team.
- Provides matching settings presets and health checks before generation.
- Explains preset objectives and tradeoffs before organizers apply them to a draft.
- Lets organizers lock live teams so their membership is preserved during later regeneration.
- Saves generated match runs as frozen snapshots for later review.
- Lets organizers mark one saved run as final for handoff.
- Lets organizers add notes to saved match runs without changing deterministic assignments.
- Generates compact saved-run share previews for organizer handoff.
- Audits saved-run integrity, saved-run drift, cohort finalization readiness, and consent/privacy posture before handoff.
- Exports and restores browser-local workspace backups for MVP data portability.
- Reports local storage health and Supabase sync posture so organizers can see what is local-only, remote-ready, or active.
- Exports and imports participant CSV files, previews rollback after import, and exports generated teams to CSV with audit-based safety gates.

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

After starting a production or local server, run the route smoke test:

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run smoke
```

The smoke runner reads `smoke-routes.json`, which is also covered by tests so public, participant, and admin route coverage stays in sync with the app navigation.

Deployment notes live in `DEPLOYMENT.md`.

The admin dashboard includes a deployment preflight card for browser-visible launch readiness. It does not replace `npm run build`, but it helps organizers confirm persistence mode, participant data, generated teams, and saved-run readiness before a launch smoke test.

Admin passcode protection is optional for local demos. To protect `/admin/*`, add these values to `.env.local` and restart the server:

```bash
ADMIN_PASSCODE=choose_a_private_admin_passcode
ADMIN_SESSION_SECRET=choose_a_long_random_session_secret
```

## Security Readiness

HackMatch AI is still an MVP, but the app includes security guardrails that make the current local workflow safer and prepare the codebase for production auth later.

- Admin routes can be protected with `ADMIN_PASSCODE` and `ADMIN_SESSION_SECRET`. If those values are absent, admin pages remain open for local demo testing.
- The admin dashboard includes actionable admin auth setup, a security readiness panel, and an organizer launch checklist that reports admin passcode setup, session secret setup, Supabase env readiness, optional OpenAI key readiness, and the smoke-test command.
- Participant team links use compact, collision-checked `hm-XXXXXX` access tokens instead of bulky IDs. Organizers can audit missing, duplicate, legacy, or risky participant links from the participant directory.
- Regenerating participant access tokens requires confirmation so organizers do not accidentally invalidate links participants already received.
- Participant team handoff pages show a privacy summary so participants can see whether their contact details are shared, how many teammate contact records are visible, and which teammate records are hidden by consent.
- Browser security headers are applied through `next.config.ts`, including content sniffing protection, frame blocking, referrer policy, and a restrictive permissions policy.
- Team exports include a sensitive export audit that highlights whether contact fields are exposed, whether exports come from live editable data or saved snapshots, and whether warnings should be reviewed before handoff.

These checks do not replace production authentication, row-level permissions, or server-side authorization. Before launch, add a real auth provider, configure Supabase row-level security, keep secrets outside the browser, and run `npm run build`, `npm run test`, and `npm run smoke`.

## Viability Workflow

Use the MVP to test real matching behavior before adding Supabase persistence:

1. Start at `/participant` for participant-facing registration and team lookup.
2. Add participants at `/participant/register`.
3. Edit or delete active participants from the admin Directory at `/admin/participants`.
4. Select or create the active cohort in Match setup at `/admin/matching`.
5. Tune team size, constraints, presets, and weights at `/admin/settings`.
6. Check generated assignments and warnings at `/admin/matching`.
7. Inspect score breakdowns, save match runs, and export results from Team review at `/admin/teams`.

The editable data is stored in browser `localStorage`, so it survives refreshes
on the same machine/browser. Use "Reset demo data" to return to the seed data.

Admin pages show a short data-loading notice while browser-local data is loading and remote persistence is checked. The admin dashboard also includes local storage diagnostics for storage availability, HackMatch key count, stored data size, and the largest local data surface.

The settings page includes local workspace backup and restore controls. A backup captures participants, matching settings, saved runs, active cohort, archived cohorts, and team review checklist state. Restores are previewed before replacing local browser data.

Organizers can export all participants or the current filtered participant view as CSV from `/admin/participants`. The same page can import participant CSVs, preview new/updated/skipped/invalid rows, inspect row-level warnings, skip or update duplicates, default missing cohort values to the active cohort, and roll back the most recent import in the current browser session.

The participants page includes an intake quality panel for consent coverage, incomplete records, low matching signal, and role concentration before organizers move into team generation. It also flags duplicate emails, names, and access tokens so organizers can resolve messy intake data before matching. Readiness quick filters let organizers jump directly to incomplete, excluded, low-signal, or duplicate participant records. Filtered batch actions let organizers move the current filtered participant set into a cohort or adjust consent/contact review states in one controlled step.

The participant directory also includes a consent and privacy audit for the active cohort. It counts matching consent, excluded participants, contact-sharing consent, assigned participants with hidden contact details, and quick filters for consent review.

The participant directory includes a detail panel for each participant. Organizers can inspect profile readiness, contact links, skills, interests, preferences, blocked teammates, and grouped edit sections without leaving the table.

Participant registrations include quality checks for required identity, role, availability, consent, duplicate emails, URL formatting, skills, and interests. If a participant enters an email that already exists, the registration page surfaces the existing record with confirmation and team-status links instead of silently creating confusion. Successful registrations receive an access token and redirect to `/participant/confirmation?access=...`, where participants can copy their team access link, review saved profile details, and see whether their current cohort assignment is ready, waiting, unassigned, or blocked by consent. Admins can open, copy, regenerate, bulk-copy, or export participant team links from `/admin/participants`. Manual lookup by name, email, or ID remains available for local testing.

The participant team page turns each access link into a team handoff with members, suggested internal roles, strengths, watch points, shared interests, shared availability, next steps, and contact details only for teammates who consented to sharing.

The participant team page also includes an assignment checklist for profile lookup, matching consent, team assignment, and contact-sharing status so participants can quickly understand why an assignment is ready, hidden, or still waiting.

Generated teams can be saved from `/admin/teams` as frozen match runs. A saved run stores the exact teams, scores, warnings, explanations, settings snapshot, and participant snapshot used for export, even if editable data changes later.

Saved runs can be marked as final from `/admin/teams`. The admin dashboard then treats that final run as the organizer-approved source of truth for handoff until another run is marked final or the final marker is cleared.

Saved-run cards include integrity signals that compare frozen snapshots against live participants, settings, cohort context, and stored assignment metrics. This helps organizers see whether a run is verified, needs review, or appears stale.

The teams page also compares a saved run against the current live generated teams. It highlights score movement, assignment movement, warning changes, participants added or removed from the live snapshot, and settings differences before organizers restore, export, or mark a run final.

The teams page includes a review brief for the selected live or saved run. It summarizes assignment count, score floor, locked teams, and team-level review risks before organizers export or share results. Each team also has compact balance indicators for role coverage, skill coverage, experience, and availability before the full score breakdown.

Each team also includes a manual review checklist for role confirmation, contact-sharing review, blocker review, and final review marking. This checklist is operational metadata only; it does not alter deterministic assignments.

The teams page includes a cohort finalization gate for live generated teams. It checks minimum cohort size, generated assignments, assignment coverage, matcher warnings, consent posture, and whether the cohort has a final saved run before organizers treat the cohort as ready.

Team exports include an audit panel that previews filename, CSV row count, assigned/unassigned counts, hidden contact count, matcher warnings, and whether the export uses live editable data or a saved snapshot. Blocked export audits disable CSV download, while review-state exports require a second confirmation click before downloading.

Saved runs can be renamed, annotated with organizer notes, duplicated, restored as the live baseline, compared against current live teams, or deleted with confirmation. Restoring a saved run now starts with an impact preview that shows participant record replacement count, cohort switch, settings drift, team count, and warning count before the organizer confirms the restore.

Live teams can also be locked from `/admin/teams`. Locked teams are passed back into the deterministic matcher through explicit settings, so their participants stay together while the rest of the cohort can be regenerated and optimized.

Participants can be assigned to cohorts such as `General`, `May Hackathon`, or `Workshop A`. Admin matching and team exports use the active cohort, so separate events or groups can be generated independently without changing older saved runs. Completed cohorts can be archived from active setup lists without deleting participant records or saved run history.

## Navigation Model

The primary navigation stays intentionally small: Home, Participant, and Admin.

Participant pages use a contextual subnav for registration and team lookup. The confirmation page is not a primary destination; it appears after registration or from a saved access link.

Admin pages use a contextual subnav for Overview, Directory, Match setup, Team review, and Settings. Nested pages also show a small section trail such as `Admin / Team review` or `Participant / Register` so users can see where they are without duplicating every route in the top-level header.

## Organizer Workflow

For a realistic event rehearsal:

1. Create or select a cohort for the event.
2. Register participants manually or import them from CSV.
3. Use participant search and filters to inspect role, experience, consent, and cohort coverage.
4. Tune matching settings and generate deterministic teams for the active cohort.
5. Review score breakdowns, warnings, internal role suggestions, and explanations.
6. Save the final match run before making later participant edits.
7. Export teams or participant records as CSV for sharing and operational follow-up.

The settings page includes presets for balanced, skill-heavy, beginner-friendly, and strict-constraint matching. Preset cards explain what each preset optimizes, the tradeoff it makes, how many draft settings would change, and whether the active cohort passes preset health checks. The page also reports settings health for the active cohort, including impossible team size combinations, negative weights, participant capacity issues, and missing role coverage signals. Settings edits are previewed as a draft before they are applied, so organizers can compare live versus draft team count, assigned participants, unassigned participants, average score, and warning count. A settings guide explains current draft values in plain English across team sizing, hard constraints, and scoring weights.

The matching page includes an event setup panel for cohort name, preset, desired/min/max team size, and a shareable registration link. This gives organizers a fast path from event setup to participant intake without changing the deterministic matching rules.

The matching page also includes cohort health comparison. Organizers can compare active cohorts by participant count, matchable count, advanced participant signal, saved runs, and ready/watch/blocked status before switching the active cohort.

The matching page also includes a readiness action plan. It classifies current run issues as blockers, warnings, or informational next steps using deterministic settings validation, assignment coverage, score floor, penalties, and matcher warnings, then routes each action to the relevant admin area such as Settings, Directory, or Team review. Cohort archive controls hide completed events from active setup lists while keeping their participant data and saved match runs available.

## Organizer Safety Workflow

Before treating a cohort as final, organizers should use the built-in safety loop:

1. Confirm repeat registrations from `/participant/register` instead of creating accidental duplicates.
2. Use `/admin/participants` filters and filtered batch actions to place the right people into the active cohort.
3. Use `/admin/matching` readiness action links to resolve blockers in Settings, Directory, or Team review.
4. Use `/admin/settings` preset cards to understand preset objectives and tradeoffs before applying a draft.
5. Save a run from `/admin/teams` before exports or later participant edits.
6. Review the export audit and confirm review-state CSV downloads deliberately.
7. Preview saved-run restore impact before replacing live participants, settings, and cohort context.

The admin dashboard includes an action queue and recent activity timeline. The queue highlights the next best organizer actions from participant intake, settings health, assignment coverage, saved runs, and deployment status. The activity timeline summarizes recent participant changes and saved-run milestones for the active cohort.

The admin dashboard also reports admin access protection status. If `ADMIN_PASSCODE` is not configured, admin pages stay open for local MVP testing. When it is configured, admin routes require the passcode and the dashboard offers a logout action. The setup card shows a safe checklist for admin passcode, session secret, and server restart state without exposing secret values.

## Supabase Persistence

HackMatch AI can run fully offline with browser `localStorage`. Admin pages show whether the app is using local storage or Supabase so organizers know where edits are being kept.

The current Supabase adapter is plug-ready for editable participants, matching settings, saved match runs, and team review checklist metadata. Participant cohorts and access tokens are included in the schema and adapter. Browser-local storage remains the fallback when Supabase is absent or unavailable.

To persist editable participants and settings in Supabase, create the tables from `lib/schema.sql`, then add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

When those variables are present, the app loads participants and matching settings from Supabase and mirrors successful edits back to localStorage as a fallback. If Supabase is unavailable, the UI continues with local browser storage and shows a warning in the admin dashboard.

The admin dashboard includes a Supabase plug-readiness card that checks whether the public project URL and anon key are absent, malformed, or ready-looking before launch. This is a local shape check only; the persistence status confirms whether the app actually connected.

The dashboard also includes a Supabase sync summary. It separates the active runtime mode, public env readiness, remote-ready persistence surfaces, and local fallback posture so organizers know whether Supabase is actually active or only plug-ready.

The dashboard also includes a Supabase RLS posture panel. It separates schema/adapter readiness from production authorization readiness, and calls out admin access boundaries, anon-client policy, participant contact privacy, and saved-run snapshot privacy before launch.

## Test The Project

```bash
npm run test
npm run typecheck
npm run smoke
```

Tests cover determinism, uniqueness, team sizes, blocked teammates, consent exclusion, advanced distribution, beginner-only penalties, locked teams, score breakdowns, CSV export, access link export, CSV import duplicate handling, CSV import validation, participant import rollback summaries, participant registration validation, participant intake quality, duplicate participant review, readiness filters, privacy audits, local backup guardrails, local storage diagnostics, participant link audits, access token rotation and uniqueness guardrails, participant team briefs, participant assignment status, participant contact privacy summaries, saved-run share previews, saved-run notes, saved-run integrity, saved-run drift comparison, final saved-run marking, cohort finalization, team review summaries, team review checklists, team balance indicators, export audits, sensitive export warnings, security headers, security readiness checks, Supabase sync posture, Supabase RLS posture checks, settings presets, settings validation, settings explanations, settings impact summaries, matching readiness evaluation, cohort health comparison, admin action queues, participant activity timelines, Supabase readiness checks, deployment readiness checks, and route smoke testing.

## Main Routes

- `/`
- `/participant`
- `/participant/register`
- `/participant/confirmation`
- `/participant/team`
- `/admin/login`
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
