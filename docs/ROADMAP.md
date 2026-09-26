# Roadmap

**Current:** Phase 1 — text → recipe (in progress)
**Supabase project:** `mjbtaexynymwfjpzpdnz` (https://mjbtaexynymwfjpzpdnz.supabase.co). NOT LoopWell.
**Next step:** owner tests on phone (Expo Go) → Phase 2 (cook mode).

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
- [x] **1.5 UI: welcome + organize** (2026-09-26) — first-launch intro (3 slides + preferred language), home with Type/Voice-soon/Video-soon tiles, search (name + ingredient), filters (favorites, who taught it, dish type), recently cooked, veg dot, total time; "who taught you" on save; favorite heart; "I cooked this"
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
| 2026-09-26 | First-launch intro, then home; organize by who taught it + dish type + favorites + recently cooked + search | Owner choices |
| 2026-09-26 | Added veg/non-veg dot, total time on cards, "I cooked this" | Claude suggestion, owner approved; cook mode will set last_cooked_at automatically |
| 2026-09-26 | Step text without amounts; countable units round to whole | "3 chammach tel" didn't scale; "6½ clove" is nonsense |
| 2026-09-26 | @expo/vector-icons (MaterialCommunityIcons) | Cross-platform icons, bundled in Expo Go |
| 2026-09-26 | Web output "single" + platform-split storage | expo-sqlite doesn't run on web; enables Claude Code browser preview |
| 2026-09-26 | App name **Nuskha** (slug/scheme `nuskha`) | Owner choice: "trusted family formula" |
| 2026-09-26 | Name: Nuskha | Owner choice |
| 2026-09-26 | Welcome = 5-beat auto-playing "ad": the call → the chaos → the magic → cooking together (cartoon: son cooks, Maa on live video) → the promise (+ trust line, language, "Save your first recipe") | Owner wants emotion + trust over feature lists; story-style progress bars, tap to skip; reanimated respects reduce-motion |
| 2026-09-26 | react-native-svg for the cartoon scene | Vector, no image assets, bundled in Expo Go |
| 2026-09-26 | Beat 4 uses the owner's Maa + son characters (mom-son.png), cut to transparent PNGs in assets/images/characters | Owner wants characters to look more real; script: app/scripts/cut-characters.py |
| 2026-09-26 | Beat 4 = 12-frame flipbook "Aaj main banaunga!" using all 14 poses (StoryFlipbook.tsx); beat advances when the story ends (onDone), not on a fixed timer | Owner: "use all the characters, frame by frame"; fixed timer cut off the finale |
| 2026-09-26 | Logo = owner's heart + Maa/son (app-logo.png) on cream #FFF8F0; icons built by app/scripts/logo-icons.py (replaces render-icons.mjs) | Owner choice; script crops to the glyph so the Gemini watermark sparkle never ships |
