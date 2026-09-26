# Roadmap

**Current:** Phase 2 — cook mode built; owner phone test pending (plus 1.6 dashboard setup)
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
- [ ] **1.6 Login** — required after welcome; profiles + owner view `admin.users`; logout; delete account
  - [x] Email + password (name on sign-up), Google button (browser OAuth), code = confirm email / forgot password, set password in Account; session persists until logout
  - [x] Step A code: email 6-digit code login, `profiles` (trigger), `admin.users` view (SQL editor only), account screen, `delete-account` fn deployed
  - [ ] Owner: Google provider (Google Cloud OAuth client → Supabase Auth → Providers → Google); redirect allow-list: `nuskha://**`, `exp://**`, `http://localhost:8081`
  - [ ] Owner: custom SMTP (Resend), email template shows `{{ .Token }}`, `SUPABASE_SECRET_KEY` in app/.env → run e2e, then turn **off** anonymous sign-ins
  - [x] Gaps: delete recipe, edit recipe (RecipeEditor, zod-validated), 30 AI calls/user/24h (`claim_ai_call`, parse-recipe v5), privacy policy (docs/PRIVACY.md, linked from login + account)
  - [ ] Owner: review docs/PRIVACY.md (public once pushed); use its GitHub URL on the Google OAuth consent screen
  - [ ] Step B: Apple (required on iOS store build with Google), phone OTP (paid SMS + India DLT)
- [ ] **2. Cook mode** — one step per screen, per-step timers, local notifications, keep-awake, "next time" notes
  - [x] cook/[id]: get ready (scaled ingredients, prep checklist, last note) → one step per screen (30pt, step's ingredients with amounts, heat) → done (notes + last_cooked_at)
  - [x] timers auto-start per step, run in parallel, +1 min / stop, local notification + sound; keep-awake; read-aloud toggle (expo-speech, remembered)
  - [x] cook.check.ts (step ingredient matching, clock)
  - [ ] Phone test in Expo Go: locked-screen timer alarm, read-aloud in Hindi/Gujarati, screen stays on
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
| 2026-09-26 | Login required upfront after welcome; all methods wanted (email code now; Google/Apple/phone in Step B needing a dev build) | Owner choice |
| 2026-09-26 | Collect nothing extra: auth email/phone + `profiles.language/last_seen_at`; owner "CRM" = `admin.users` view in a non-API schema | Owner: keep simple unless AI needs more; DPDP data minimisation |
| 2026-09-26 | Email OTP code (not magic link), `delete-account` edge fn, e2e uses admin-created test users | Works in Expo Go without deep links; store rules require account deletion; anon sign-in going away |
| 2026-09-26 | Email + password with name on sign-up, plus Google via browser OAuth (PKCE); email code kept for confirm + forgot password | Owner wants passwords + Google; browser OAuth works in Expo Go, no native module |
| 2026-09-26 | Name stored in auth user_metadata (Google gives full_name); shown in `admin.users` | No extra table/column needed |
| 2026-09-26 | Edit recipe in place (title, ingredients, prep, steps) + delete with two-tap confirm | Owner: fix AI mistakes without re-pasting |
| 2026-09-26 | AI limit 30 calls / user / rolling 24h via `claim_ai_call()` (advisory lock, counted as the user) | Protect OpenRouter credit; atomic in one RPC |
| 2026-09-26 | Privacy policy = docs/PRIVACY.md on the public GitHub repo, opened in-app | One source; repo is public so the URL works for Google consent + stores |
| 2026-09-26 | Cook mode timers auto-start on reaching a step; several run at once; alarm = local notification (works in Expo Go) | Owner choice; no background audio needed |
| 2026-09-26 | Read aloud via expo-speech, speaker toggle remembered in prefs, uses recipe.language | Owner: hands are messy, phone on the counter |
| 2026-09-26 | Step shows amounts of ingredients its text mentions (name / first-word match) | Step text has no amounts by design; cook shouldn't scroll back |
