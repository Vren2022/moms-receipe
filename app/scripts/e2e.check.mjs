// End-to-end check against the real Supabase project: test users -> parse-recipe -> insert -> RLS read -> delete-account.
// Run from app/: node --env-file=.env scripts/e2e.check.mjs
// Needs SUPABASE_SECRET_KEY in app/.env (Dashboard -> API keys). Test-only: never EXPO_PUBLIC_, never in the app.
import { createClient } from '@supabase/supabase-js';

const { EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub, SUPABASE_SECRET_KEY: secret } = process.env;
if (!secret) throw new Error('set SUPABASE_SECRET_KEY in app/.env');
const admin = createClient(url, secret, { auth: { persistSession: false } });

// Real (non-anonymous) user, signed in with a throwaway password so no email is sent.
async function testUser(tag) {
  const email = `e2e-${tag}-${Date.now()}@nuskha.test`;
  const password = crypto.randomUUID();
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  const c = createClient(url, pub, { auth: { persistSession: false } });
  const { data, error: e2 } = await c.auth.signInWithPassword({ email, password });
  if (e2) throw new Error(`sign-in: ${e2.message}`);
  return { c, id: data.user.id };
}

const { c: sb, id: me } = await testUser('a');

const samples = {
  hinglish:
    'Mummy ki aloo gobi 4 logon ke liye: pehle gobi aur 3 aloo kaat ke rakh lo. Kadhai mein 3 chammach tel garam karo, jeera daalo. Phir 1 pyaaz golden hone tak bhuno. Haldi, dhaniya powder, lal mirch daalo, 1 minute. Aloo gobi daal ke namak daalo aur dhak ke 15 minute dheemi aanch pe pakao. Last mein garam masala aur dhaniya patta.',
  gujarati:
    'બે જણ માટે ભીંડા નું શાક: ભીંડા ધોઈ ને સુકવી ને સમારી લો. કડાઈ માં 2 ચમચી તેલ ગરમ કરો, રાઈ અને હિંગ નાખો. ભીંડા નાખી 10 મિનિટ ધીમા તાપે ચડવા દો. પછી હળદર, મરચું, ધાણાજીરું અને મીઠું નાખી 5 મિનિટ પકાવો.',
};

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

// Profile row comes from the signup trigger; the app updates last_seen/language.
const { error: profErr } = await sb.from('profiles').update({ last_seen_at: new Date().toISOString(), language: 'hi' }).eq('id', me);
if (profErr) throw new Error(`profile update: ${profErr.message}`);
const { data: prof } = await sb.from('profiles').select('language').eq('id', me).single();
if (prof?.language !== 'hi') throw new Error('profile row missing (trigger?)');

// RLS: another user must not see our recipes or profile.
const { c: other, id: otherId } = await testUser('b');
const { data: leaked } = await other.from('recipes').select('id');
if (leaked?.length) throw new Error('RLS leak: other user sees recipes');
const { data: leakedProf } = await other.from('profiles').select('id').eq('id', me);
if (leakedProf?.length) throw new Error('RLS leak: other user sees profile');

// delete-account removes the user and cascades recipes + profile.
for (const [c, id] of [[sb, me], [other, otherId]]) {
  const { error } = await c.functions.invoke('delete-account');
  if (error) throw new Error(`delete-account: ${error.message}`);
  const { data: gone } = await admin.auth.admin.getUserById(id);
  if (gone?.user) throw new Error('delete-account: user still exists');
}
const { count } = await admin.from('recipes').select('id', { count: 'exact', head: true }).in('id', ids);
if (count) throw new Error('delete-account: recipes not cascaded');
console.log('\ne2e ok');
