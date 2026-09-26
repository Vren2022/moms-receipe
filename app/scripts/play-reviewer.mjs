// Creates (or resets) the Google Play reviewer account in production with 2 real AI-made recipes.
// Run from app/: node --env-file=.env scripts/play-reviewer.mjs  -> credentials in ../.env.play-review (gitignored)
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const { EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub, SUPABASE_SECRET_KEY: secret } = process.env;
const admin = createClient(url, secret, { auth: { persistSession: false } });
const email = 'virenvaviya2022+playreview@gmail.com';
const password = 'Nuskha-' + crypto.randomUUID().slice(0, 13);
const { data: list } = await admin.auth.admin.listUsers();
const old = list.users.find((u) => u.email === email);
if (old) await admin.auth.admin.deleteUser(old.id);
const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: 'Play Reviewer' } });
if (error) throw error;
const sb = createClient(url, pub, { auth: { persistSession: false } });
const { error: e2 } = await sb.auth.signInWithPassword({ email, password });
if (e2) throw e2;
const samples = [
  ['Mom', 'Mummy ki aloo gobi 4 logon ke liye: pehle gobi aur 3 aloo kaat ke rakh lo. Kadhai mein 3 chammach tel garam karo, jeera daalo. Phir 1 pyaaz golden hone tak bhuno. Haldi, dhaniya powder, lal mirch daalo, 1 minute. Aloo gobi daal ke namak daalo aur dhak ke 15 minute dheemi aanch pe pakao. Last mein garam masala aur dhaniya patta.'],
  ['Nani', "Nani's masala chai for 2: boil 1 cup water with 1 inch crushed ginger and 2 crushed cardamom for 2 minutes. Add 2 tsp tea leaves and boil 1 minute. Add 1 cup milk and 2 tsp sugar, bring to a boil twice. Strain and serve hot."],
];
for (const [taught_by, text] of samples) {
  const { data, error } = await sb.functions.invoke('parse-recipe', { body: { text, language: 'Same as input' } });
  if (error) throw error;
  const { error: e3 } = await sb.from('recipes').insert({ ...data, source: 'text', raw_input: text, taught_by });
  if (e3) throw e3;
  console.log('added:', data.title, `(${data.steps.length} steps)`);
}
fs.writeFileSync(new URL('../../.env.play-review', import.meta.url), `# Google Play -> App content -> App access. Local only (gitignored). Paste into Play Console.\nPLAY_REVIEW_EMAIL=${email}\nPLAY_REVIEW_PASSWORD=${password}\n`);
console.log('reviewer account ready; credentials in .env.play-review');
