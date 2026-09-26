# Roadmap

**Current:** Phase 1 — text → recipe (in progress)
**Supabase project:** `mjbtaexynymwfjpzpdnz` (https://mjbtaexynymwfjpzpdnz.supabase.co). NOT LoopWell.
**Next step:** owner tests on phone (Expo Go) → Phase 2 (cook mode).
**Known issue for Phase 2:** step text embeds quantities ("3 chammach tel") that don't change when servings change — steps should reference ingredients so cook mode can show scaled amounts.

## Phases
- [x] **0. Context** — AGENTS.md, CLAUDE.md, ROADMAP, git
- [ ] **1. Text → recipe** — Expo app, `recipes` table, `parse-recipe` function, paste → preview → save, list, view, servings scaler
  - [x] scale logic + check
  - [x] recipe schema (zod)
  - [x] screens: list / add / recipe
  - [x] migration + parse-recipe function written (not yet applied/deployed)
  - [x] Supabase project linked, migration applied, security advisors clean
  - [x] Edge function deployed (v2: rejects non-user callers)
  - [x] Anonymous sign-ins enabled (dashboard)
  - [x] `OPENROUTER_API_KEY` function secret set (dashboard)
  - [x] e2e check passes (Hinglish + Gujarati, RLS isolation) — 2026-09-26
  - [ ] Tested on phone with Hinglish + Gujarati samples
- [ ] **2. Cook mode** — one step per screen, per-step timers, local notifications, keep-awake, "next time" notes
- [ ] **3. Voice** — record/upload audio → Storage → Edge Function → audio-capable model (Gemini via OpenRouter) → same JSON. Note: live call recording is blocked on iOS/most Android; accept any audio file (second device, call-recorder file, or user re-telling).
- [ ] **4. YouTube** — save link always; extract recipe when transcript/model allows
- [ ] **5. Later** — real login + family sharing, shopping list, search

## Decision log (append-only)
| Date | Decision | Why |
|---|---|---|
| 2026-09-25 | Expo (React Native) app | Owner wants native mobile; timers/notifications |
| 2026-09-25 | Supabase (DB, anon auth, storage, edge fns) | Owner choice; anon auth gives RLS with no login UI |
| 2026-09-25 | OpenRouter for AI, called only from Edge Functions | Owner choice; key stays server-side |
| 2026-09-25 | Input in multiple Indian languages; output language chosen by user | Owner requirement |
| 2026-09-25 | One `recipes` table with jsonb prep/ingredients/steps | Fewest moving parts; all sources share one JSON contract |
| 2026-09-25 | Per-ingredient `scale` (linear/partial/to_taste) | Salt/spice/oil don't scale linearly |
| 2026-09-25 | npm, StyleSheet + theme.ts, zod, no state lib | Owner delegated frontend; add libs only when needed |
| 2026-09-25 | AGENTS.md (source) + CLAUDE.md (imports) + this ROADMAP + Claude memory | Owner shouldn't re-explain context each day |
| 2026-09-25 | Git + GitHub, commit per phase | Owner choice |
| 2026-09-25 | Don't use LoopWell Supabase project | Owner: it belongs to another repo; this app gets its own |
| 2026-09-25 | Model `google/gemini-3.8-flash` via OpenRouter | Cheap, multilingual, accepts audio (Phase 3) |
| 2026-09-26 | parse-recipe requires a real user JWT, not just the anon key | Public anon key alone must not spend AI credit; rate limit deferred |
