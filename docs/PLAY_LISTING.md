# Google Play listing kit — Nuskha (app.nuskha)

Copy-paste source for Play Console. Links (public repo):
- Privacy policy: https://github.com/Vren2022/moms-receipe/blob/main/docs/PRIVACY.md
- Delete account: https://github.com/Vren2022/moms-receipe/blob/main/docs/DELETE_ACCOUNT.md
- Contact email: virenvaviya2022@gmail.com
- Graphics: `store/icon-512.png`, `store/feature-1024x500.png` (regenerate: `python app/scripts/logo-icons.py`)

## Store listing
**App name (≤30):** Nuskha: Mom's Recipes

**Short description (≤80):**
Save Mom's recipes in any language. Cook them step by step with timers.

**Full description (≤4000):**
Mom told you how to make her dal over the phone. Nani explained her chai once. You watched a video and forgot the timings. Nuskha makes sure you never have to remember again.

Just paste or type the recipe the way it was told to you: in Hindi, Gujarati, Hinglish, English or mixed. Nuskha's AI turns it into a clean recipe:
• Ingredients with amounts
• What to prepare before you start
• Steps in the right order, with cooking times and heat level

COOK MODE: one step at a time, big and clear
• Big text you can read from across the kitchen
• Timers start by themselves on each step, and ring even when the phone is locked
• Several timers at once (dal on one burner, rice on the other)
• Tap the speaker to hear each step read aloud
• The screen stays on while you cook
• At the end, jot down "next time" notes: less salt, more time…

COOK FOR ANY NUMBER OF PEOPLE
Change the servings and every amount updates. Spices and oil scale sensibly, salt stays "to taste", and you never get "6½ cloves".

ORGANISE YOUR FAMILY'S RECIPES
• Remember who taught you: Mom, Nani, Dadi, YouTube…
• Favourites, dish types, veg / non-veg marks
• Search by dish or ingredient
• "Recently cooked" at a glance

PRIVATE BY DEFAULT
Your recipes are only visible to you. No ads. Delete your account and everything in it any time, right in the app.

Nuskha: the trusted family formula, saved forever.

**Category:** Food & Drink  ·  **Tags:** Recipes, Cooking
**Graphics:** icon 512×512 and feature graphic 1024×500 from `store/`. Phone screenshots: see the shot list below.

### Screenshot shot list (take on your phone with the preview/production build; 4–6 portrait shots)
1. Home with 4–6 recipes (favourites + "Recently cooked" visible)
2. Add recipe: pasted Hinglish text
3. The AI result preview (ingredients + steps)
4. Recipe screen with the servings stepper changed (e.g. 4 people)
5. Cook mode: a step with the timer running
6. Cook mode "Well done!" with a next-time note

## App content (Policy → App content)
- **Privacy policy:** URL above
- **Ads:** No, the app contains no ads
- **App access:** All or some functionality is restricted →
  - Instructions: "On the first screen tap 'Already have an account? Log in', then enter the email and password below."
  - Username / password: from `.env.play-review` (local file, gitignored). Regenerate with `node --env-file=.env scripts/play-reviewer.mjs` (from app/)
- **Content rating (IARC):** Category "Reference, News, or Educational" (or "All other app types"). Answer **No** to violence, sexuality, language, controlled substances, gambling, and user interaction (users can't communicate or share content with each other). No location sharing, no digital purchases. Expected: Everyone / PEGI 3.
- **Target audience:** 13–15, 16–17, 18+ (not under 13, matching the privacy policy). Appeals to children: No.
- **News app:** No · **Government app:** No · **Financial features:** None · **Health:** None
- **Data safety:** see below

## Data safety
Does the app collect or share user data? **Yes, it collects; nothing is shared.** (Supabase, OpenRouter/Gemini and Gmail act as service providers on our behalf, so this doesn't count as "sharing".)
Encrypted in transit: **Yes** · Users can request deletion: **Yes** (in-app + delete-account URL)

| Data type | Collected | Shared | Required? | Purposes |
|---|---|---|---|---|
| Personal info → Email address | Yes | No | Required | Account management |
| Personal info → Name | Yes | No | Required | Account management, App functionality |
| Personal info → User IDs | Yes | No | Required | Account management |
| App activity → Other user-generated content (recipes, notes) | Yes | No | Required | App functionality |
| App activity → App interactions (last opened time, AI request count) | Yes | No | Required | App functionality, Analytics, Fraud prevention/security |

Not collected: location, financial info, health, messages, photos/videos, audio (update this when voice input ships), files, calendar, contacts, web history, device or advertising IDs.

## Release
- Track: **Internal testing** first (add your own Gmail as tester) → check the **pre-launch report** → promote to **Production**.
- Release name: `1.0.0 (1)` · Release notes: "First release of Nuskha: save family recipes in any language and cook them step by step."
