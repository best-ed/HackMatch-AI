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
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the deployment environment.
4. Redeploy.
5. Confirm `/admin` shows `Supabase connected`.

## Optional OpenAI Setup

1. Add `OPENAI_API_KEY`.
2. Optionally set `OPENAI_EXPLANATION_MODEL`.
3. Redeploy.
4. Confirm `/admin/teams` can refresh explanations.

AI only explains deterministic team assignments. It never assigns or changes teams.

## Launch Smoke Test

1. Open `/`.
2. Register a participant at `/participant/register`.
3. Confirm redirect to `/participant/confirmation?access=...`.
4. Open `/admin/participants` and confirm the participant appears.
5. Open `/admin/matching` and check viability warnings.
6. Open `/admin/teams` and download CSV.
