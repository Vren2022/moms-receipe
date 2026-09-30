// Live check: every "Show the recipe in" option really comes back in that language + script, valid, and saves.
// Real parse-recipe + DB on the production project, throwaway user (deleted at the end). ~12 AI calls.
// Run from app/: node --no-warnings --env-file=.env scripts/languages.check.mjs  (Node 22.18+ loads the .ts schema natively)
import { createClient } from '@supabase/supabase-js';

import { RecipeSchema } from '../src/lib/recipeSchema.ts';

const { EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub, SUPABASE_SECRET_KEY: secret } = process.env;
if (!secret) throw new Error('set SUPABASE_SECRET_KEY in app/.env');
const admin = createClient(url, secret, { auth: { persistSession: false } });

const email = `lang-${Date.now()}@nuskha.test`;
const password = crypto.randomUUID();
const { data: made, error: mkErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (mkErr) throw new Error(`createUser: ${mkErr.message}`);
const sb = createClient(url, pub, { auth: { persistSession: false } });
const { error: inErr } = await sb.auth.signInWithPassword({ email, password });
if (inErr) throw new Error(`sign-in: ${inErr.message}`);

const INPUTS = {
  hinglish: 'Mummy ki aloo gobi 2 logon ke liye: 2 aloo aur 1 gobi kaat lo. Kadhai mein 2 chammach tel garam karo, jeera daalo. Pyaaz golden hone tak bhuno. Haldi, lal mirch, namak daalo. Aloo gobi daal ke dhak ke 15 minute dheemi aanch pe pakao.',
  hindi: 'दो लोगों के लिए मूंग दाल: एक कप दाल धोकर 20 मिनट भिगो दो। कुकर में दाल, हल्दी, नमक और 3 कप पानी डालकर 3 सीटी लगाओ। तड़के के लिए 1 चम्मच घी में जीरा और हींग डालो, दाल पर डाल दो।',
  english: 'Mom’s poha for 2: rinse 2 cups poha and drain. Heat 2 tbsp oil, add mustard seeds and curry leaves. Add 1 chopped onion and cook until soft, 3 minutes. Add turmeric, salt and the poha, mix and cook 2 minutes on low. Finish with lemon juice.',
  gujarati: 'બે જણ માટે ભીંડા નું શાક: ભીંડા ધોઈ ને સમારી લો. કડાઈ માં 2 ચમચી તેલ ગરમ કરો, રાઈ અને હિંગ નાખો. ભીંડા નાખી 10 મિનિટ ધીમા તાપે ચડવા દો. પછી હળદર, મરચું અને મીઠું નાખી 5 મિનિટ પકાવો.',
};

// Unicode block per script; Latin = a-z.
const SCRIPTS = { latin: /[a-z]/i, devanagari: /[ऀ-ॿ]/, gujarati: /[઀-૿]/, tamil: /[஀-௿]/, telugu: /[ఀ-౿]/, bengali: /[ঀ-৿]/ };
const EXPECT = {
  English: { script: 'latin', code: 'en' },
  Hindi: { script: 'devanagari', code: 'hi' },
  Gujarati: { script: 'gujarati', code: 'gu' },
  Marathi: { script: 'devanagari', code: 'mr' },
  Tamil: { script: 'tamil', code: 'ta' },
  Telugu: { script: 'telugu', code: 'te' },
  Bengali: { script: 'bengali', code: 'bn' },
};
const SAME = { hinglish: { script: 'latin', code: 'hi' }, hindi: { script: 'devanagari', code: 'hi' }, english: { script: 'latin', code: 'en' }, gujarati: { script: 'gujarati', code: 'gu' } };
const HINGLISH_WORDS = /\b(karo|daalo|daal ke|aur|pehle|phir|bhuno|pakao|garam)\b/i;

// Share of letters (outside digits/punctuation) that belong to the expected script.
function scriptShare(text, script) {
  const letters = [...text].filter((ch) => /\p{L}|\p{M}/u.test(ch));
  return letters.length ? letters.filter((ch) => SCRIPTS[script].test(ch)).length / letters.length : 0;
}

const cases = [
  ...Object.keys(EXPECT).map((lang) => ({ input: 'hinglish', lang, want: EXPECT[lang] })),
  ...Object.keys(SAME).map((input) => ({ input, lang: 'Same as input', want: SAME[input] })),
];

const rows = [];
let failed = 0;
try {
  for (const { input, lang, want } of cases) {
    const t0 = Date.now();
    const { data, error } = await sb.functions.invoke('parse-recipe', { body: { text: INPUTS[input], language: lang } });
    const ms = Date.now() - t0;
    const problems = [];
    const notes = [];
    let title = '-';
    if (error) problems.push(`function error ${error.context?.status ?? error.message}`);
    else {
      const parsed = RecipeSchema.safeParse(data);
      if (!parsed.success) problems.push(`schema: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
      else {
        const r = parsed.data;
        title = r.title;
        const all = [r.title, ...r.ingredients.map((i) => i.name), ...r.prep.map((p) => p.text), ...r.steps.map((s) => s.text)].join(' ');
        const share = scriptShare(all, want.script);
        if (share < 0.85) problems.push(`script ${want.script} only ${Math.round(share * 100)}%`);
        if (!r.language.toLowerCase().startsWith(want.code)) problems.push(`language code "${r.language}" (want ${want.code})`);
        if (lang === 'English' && HINGLISH_WORDS.test(all)) problems.push('English output still has Hinglish words');
        if (lang === 'Same as input' && input === 'hinglish' && !HINGLISH_WORDS.test(all)) notes.push('Hinglish in, plain English out?');
        // Meaning survives translation: numbers live outside the text, so they must match the input in every language.
        if (r.base_servings !== 2) problems.push(`serves ${r.base_servings} (input says 2)`);
        if (input === 'hinglish' && !r.steps.some((s) => s.duration_sec === 900)) problems.push('lost the 15-minute step');
        if (input === 'hinglish') notes.push(`${r.ingredients.length} ingredients / ${r.steps.length} steps`);
        const amounts = r.steps.filter((s) => /\b\d+(\.\d+)?\s*(tbsp|tsp|cup|cups|chammach|g|gm|ml|kg)\b/i.test(s.text));
        if (amounts.length) notes.push(`${amounts.length} step(s) contain amounts`);
        const { error: insErr } = await sb.from('recipes').insert({ ...r, source: 'text', raw_input: INPUTS[input], taught_by: 'Mom' });
        if (insErr) problems.push(`insert: ${insErr.message}`);
      }
    }
    if (problems.length) failed++;
    rows.push({ input, output: lang, ok: problems.length ? 'FAIL' : 'ok', ms, code: data?.language ?? '-', title, issues: [...problems, ...notes].join('; ') });
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${input.padEnd(8)} -> ${lang.padEnd(13)} ${String(ms).padStart(5)}ms  [${data?.language ?? '-'}] ${title}${problems.length || notes.length ? `  <- ${[...problems, ...notes].join('; ')}` : ''}`);
  }
} finally {
  await admin.auth.admin.deleteUser(made.user.id); // cascades recipes + profile
}

console.log(JSON.stringify(rows));
console.log(failed ? `\nlanguages: ${failed}/${cases.length} FAILED` : `\nlanguages ok (${cases.length} cases)`);
process.exit(failed ? 1 : 0);
