# Deployment Checklist

HackMatch AI is designed to deploy without Supabase or OpenAI keys. In that mode it uses browser `localStorage` and deterministic fallback explanations.

## Preflight

Run these before deploying:

```bash
npm install
npm run typecheck
npm run test
npm run build
```

The `/admin` dashboard also includes a deployment preflight card. It checks browser-visible readiness signals such as persistence mode, participant data, generated teams, and saved runs. Treat it as a launch helper, not a replacement for the commands above.

Before handing the app to organizers, use `/admin` to confirm the Launch checklist:

- Admin protection is configured for deployed organizer routes.
- The active cohort has matchable participants.
- Matching settings are viable.
- Assignment coverage is complete or intentionally reviewed.
- Export privacy is reviewed for contact-sharing exposure.
- Production build is ready after `npm run build`.
- Persistence mode is intentional.
- A saved run exists and one saved run is marked final.
- Saved-run remote support is ready if Supabase is configured.
- AI explanation mode is intentional: deterministic fallback or OpenAI-backed explanations.

## Vercel

1. Import the GitHub repo into Vercel.
2. Use the default Next.js framework preset.
3. Keep the install command as `npm install`.
4. Keep the build command as `npm run build`.
5. Leave env vars empty for a localStorage-only MVP deployment, or add the optional values below.

## Optional Env Vars

```bash
OPENAI_API_KEY=
OPENAI_EXPLANATION_MODEL=gpt-5.2
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the Supabase anon public key, not the service role key.

## Optional Supabase Setup

1. Create a Supabase project.
2. Run `lib/schema.sql` in the Supabase SQL editor.
3. Confirm the schema includes `participants`, `matching_settings`, `match_runs`, and `team_review_checklists`.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the deployment environment.
5. Redeploy.
6. Confirm `/admin` shows the Supabase plug-readiness card as ready and the persistence status as `Supabase connected`.

Current remote persistence coverage:

- Participants: remote-ready.
- Matching settings: remote-ready.
- Saved match runs, final markers, and organizer notes: remote-ready.
- Team review checklist rows: schema-ready, but the current UI still stores checklist state in browser storage.

Keep using the anon public key for the browser-facing adapter. Do not expose the service role key.

## Supabase RLS Posture

The Supabase schema and adapter are plug-ready, but production authorization still requires deliberate RLS policies and an authenticated organizer model.

Before treating Supabase as production-ready:

1. Configure `ADMIN_PASSCODE` and `ADMIN_SESSION_SECRET` or replace the passcode gate with a real auth provider.
2. Enable RLS on organizer-owned tables before exposing the app to untrusted users.
3. Restrict `participants` reads and writes so public clients cannot list participant contact details, access tokens, or consent fields without organizer authorization.
4. Restrict `match_runs` because saved runs contain full participant and settings snapshots.
5. Restrict `matching_settings` and `team_review_checklists` writes to authenticated organizers.
6. Keep the service role key out of browser-visible `NEXT_PUBLIC_*` variables.

The `/admin` Supabase RLS posture panel is a launch helper. It does not create Supabase policies automatically.

## Final Run Handoff

Before the event goes live:

1. Open `/admin/matching` and confirm the active cohort.
2. Open `/admin/teams`.
3. Save the generated teams as a match run.
4. Review warnings, score breakdowns, team balance, and checklist state.
5. Compare the saved run against live teams for score movement, assignment drift, participant snapshot changes, and settings differences.
6. Mark one saved run as final.
7. Download the CSV from the final saved run view.
8. Open `/participant/team?access=...` for at least one participant in the final run and confirm the privacy summary matches contact-sharing consent.

If participants or settings change after this point, save a new run and mark the new run final only after review.

## Rollback And Audit

For launch rehearsal:

1. Use `/admin/participants` CSV import preview before applying bulk participant changes.
2. Use the import rollback preview immediately if an import produces bad data.
3. Use `/admin/teams` Operations history to inspect local saved-run, lock, restore, share, and checklist actions.
4. Use saved-run restore only when you intentionally want to bring an older participant/settings snapshot back into the live baseline.

## Production Smoke Test

After deployment:

1. Open `/`.
2. Register a participant at `/participant/register`.
3. Confirm redirect to `/participant/confirmation?access=...`.
4. Open `/admin/participants` and confirm the participant appears without replacing existing participants.
5. Open `/admin/matching` and confirm the correct active cohort.
6. Open `/admin/teams`, save a run, mark it final, and download CSV.
7. Open `/participant/team?access=...` and confirm the participant handoff renders.
8. Open `/admin` and confirm persistence, Supabase readiness, launch checklist, and deployment preflight states match the intended launch mode.

## Previous MVP Smoke Test

This shorter smoke test is still useful during local development:

1. Open `/`.
2. Register a participant at `/participant/register`.
3. Confirm redirect to `/participant/confirmation?access=...`.
4. Open `/admin/participants` and confirm the participant appears.
5. Open `/admin/matching` and check viability warnings.
6. Open `/admin/teams` and download CSV.
7. Open `/participant/team?access=...` and confirm the participant handoff renders.
8. Open `/admin` and confirm persistence, Supabase readiness, and deployment preflight states match the intended launch mode.

## Optional OpenAI Setup

1. Add `OPENAI_API_KEY`.
2. Optionally set `OPENAI_EXPLANATION_MODEL`.
3. Redeploy.
4. Confirm `/admin/teams` can refresh explanations.

AI only explains deterministic team assignments. It never assigns or changes teams.
