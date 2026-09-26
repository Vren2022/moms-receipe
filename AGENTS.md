# AGENTS.md — Mom's recipes app

Single source of truth for any coding agent (Claude Code, Codex, Cursor). Read this + `docs/ROADMAP.md` before doing anything.

## Product
People forget recipes told by mom / relatives / YouTube. The user dumps raw input (typed text, voice note, YouTube link — in any Indian language) and AI turns it into an **ordered, timed, scalable recipe**. A **cook mode** walks them through it step by step with timers. Goal: the user never has to remember anything. This is NOT a notes app.

## Owner
AI engineer. Tells you *what* to build next; don't make them re-explain context. When a decision is genuinely theirs (product scope, paid services, naming, anything public), **ask with AskUserQuestion** instead of guessing. Sensible technical defaults: just pick, and log them in the decision log.

## Stack
- `app/` — Expo (React Native, Expo Router, TypeScript), npm, plain `StyleSheet` + `lib/theme.ts`
- `supabase/` — Postgres (`recipes` table, RLS owner-only), anonymous auth, Storage (Phase 3), Edge Functions (Deno)
- AI — OpenRouter, called **only** from Edge Functions. `OPENROUTER_API_KEY` is a Supabase function secret. Never put API keys in the app.
- Validation — `zod`. AI output is untrusted input: validate before saving/showing.

## Layout
```
AGENTS.md / CLAUDE.md          agent context
docs/ROADMAP.md                phases, current step, decision log
app/                           Expo app (SDK 57) — also read app/AGENTS.md (Expo-specific rules: use `npx expo install`, fetch versioned docs)
  src/app/                     screens (Expo Router): welcome (first launch), index (home), add, recipe/[id]
  src/components/              RecipeBody (servings stepper, ingredients, prep, steps), ui (Btn, Chip, VegDot)
  src/lib/                     supabase client, storage (SQLite localStorage on native / browser on web), prefs,
                               recipeSchema, scale, labels (languages, teachers, categories, time helpers), theme
supabase/migrations/           SQL migrations
supabase/functions/parse-recipe/  raw input -> recipe JSON
```

## Recipe JSON contract (every input source must produce this)
```json
{
  "title": "Aloo Gobi",
  "category": "sabzi",
  "is_veg": true,
  "base_servings": 2,
  "language": "hi",
  "ingredients": [{"name":"onion","qty":1,"unit":"pc","scale":"linear"}],
  "prep":  [{"text":"Chop onion finely"}],
  "steps": [{"text":"Heat 2 tbsp oil, add jeera","duration_sec":30,"heat":"medium"}]
}
```
- `scale`: `linear` (×factor) | `partial` (×factor^0.7 — spices, oil) | `to_taste` (salt etc.: show base + "adjust")
- `category`: sabzi | dal | rice | roti | snack | sweet | drink | other. `is_veg`: false if meat/fish/egg.
- Step/prep text never contains amounts — amounts live only in `ingredients` so scaling stays correct.
- Countable units (pc, clove, pinch) scale to whole numbers.
- Saved-only columns (not from AI): `taught_by`, `is_favorite`, `last_cooked_at`, `source`, `raw_input`, `notes`.
- `qty` may be null ("a pinch"); `duration_sec` and `heat` optional.
- Source of truth: `app/src/lib/recipeSchema.ts` (Edge Function keeps a mirrored copy — change both together).

## UX rules (kitchen-first)
Big text (cook-step text ≥ 24pt), big tap targets (messy hands), high contrast, one step per screen in cook mode, servings stepper always visible, one-tap timers, screen stays awake while cooking.

## Working rules
- One phase at a time (see ROADMAP). Plan → owner approves → build → verify → update ROADMAP → commit.
- Smallest thing that works; no abstractions/libraries before they're needed.
- Non-trivial logic leaves one runnable check (e.g. `app/src/lib/scale.check.ts`).
- Never commit `.env*`.

## Run / verify
- Web preview inside Claude Code: `.claude/launch.json` → `app-web` (port 8081). Good for UI checks; test native bits (timers, audio) in Expo Go.
- App: copy `app/.env.example` → `app/.env`, fill Supabase URL + publishable key, then `cd app && npx expo start` → scan with Expo Go.
- Checks: `cd app && npx tsc --noEmit && npx expo lint && npx tsx src/lib/scale.check.ts`
- E2E (real Supabase + AI): `cd app && node --env-file=.env scripts/e2e.check.mjs`
- Supabase: enable **Anonymous sign-ins** (Auth → Providers). Migrations in `supabase/migrations/`.
- AI model: one constant `MODEL` in `supabase/functions/parse-recipe/index.ts`.
- Edge function deploy: Supabase MCP `deploy_edge_function` or `supabase functions deploy parse-recipe`.
