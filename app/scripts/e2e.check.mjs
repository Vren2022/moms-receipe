// End-to-end check against the real Supabase project: anon sign-in -> parse-recipe -> insert -> RLS read -> cleanup.
// Run from app/: node --env-file=.env scripts/e2e.check.mjs
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});

const samples = {
  hinglish:
    'Mummy ki aloo gobi 4 logon ke liye: pehle gobi aur 3 aloo kaat ke rakh lo. Kadhai mein 3 chammach tel garam karo, jeera daalo. Phir 1 pyaaz golden hone tak bhuno. Haldi, dhaniya powder, lal mirch daalo, 1 minute. Aloo gobi daal ke namak daalo aur dhak ke 15 minute dheemi aanch pe pakao. Last mein garam masala aur dhaniya patta.',
  gujarati:
    'બે જણ માટે ભીંડા નું શાક: ભીંડા ધોઈ ને સુકવી ને સમારી લો. કડાઈ માં 2 ચમચી તેલ ગરમ કરો, રાઈ અને હિંગ નાખો. ભીંડા નાખી 10 મિનિટ ધીમા તાપે ચડવા દો. પછી હળદર, મરચું, ધાણાજીરું અને મીઠું નાખી 5 મિનિટ પકાવો.',
};

const { error: authErr } = await sb.auth.signInAnonymously();
if (authErr) throw new Error(`anon sign-in failed (enable Anonymous sign-ins?): ${authErr.message}`);

const ids = [];
for (const [name, text] of Object.entries(samples)) {
  const { data, error } = await sb.functions.invoke('parse-recipe', { body: { text, language: 'Same as input' } });
  if (error) {
    const body = await error.context?.text?.().catch(() => '');
    throw new Error(`${name}: function error ${error.message} ${body ?? ''}`);
  }
  console.log(`\n== ${name}: ${data.title} (serves ${data.base_servings}, ${data.language})`);
  for (const i of data.ingredients) console.log(`  ${i.qty ?? '-'} ${i.unit} ${i.name} [${i.scale}]`);
  data.prep.forEach((p) => console.log(`  prep: ${p.text}`));
  data.steps.forEach((s, n) => console.log(`  ${n + 1}. ${s.text}${s.duration_sec ? ` (${s.duration_sec}s)` : ''}${s.heat ? ` [${s.heat}]` : ''}`));

  const { data: row, error: insErr } = await sb.from('recipes').insert({ ...data, source: 'text', raw_input: text }).select('id').single();
  if (insErr) throw new Error(`${name}: insert failed ${insErr.message}`);
  const { data: back } = await sb.from('recipes').select('title').eq('id', row.id).single();
  if (back?.title !== data.title) throw new Error(`${name}: read-back mismatch`);
  ids.push(row.id);
}

// RLS: a fresh anonymous user must not see anything of ours.
const other = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
await other.auth.signInAnonymously();
const { data: leaked } = await other.from('recipes').select('id');
if (leaked?.length) throw new Error('RLS leak: other user sees rows');
await sb.from('recipes').delete().in('id', ids);
console.log('\ne2e ok');
