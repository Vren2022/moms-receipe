# Local testing (Docker)

Full copy of the backend on this PC — test every screen without touching real users or data.

- Start / stop: `npx supabase start` / `npx supabase stop` (from repo root). Applies all migrations.
- Functions: served automatically; secrets from `supabase/functions/.env` (gitignored): `OPENROUTER_API_KEY=...`
- App against local: preview config `app-web-local` (port 8084) sets `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  + the local publishable key. Never put local values in `app/.env` (the phone uses it).
- Emails (sign-up / login codes): Mailpit at http://127.0.0.1:54324
- Studio (tables, users): http://127.0.0.1:54323
- Email templates (code, not link): `supabase/templates/*.html` — paste the same into the production dashboard.

## Test account (local stack only, throwaway)
- Email: cook-tester@nuskha.test
- Password: local-174ad1a464ff
