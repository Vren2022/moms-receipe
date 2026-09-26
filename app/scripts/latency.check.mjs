// Latency of the user-facing paths against a real Supabase project (median of N runs).
// Run from app/: node --env-file=.env scripts/latency.check.mjs   (needs SUPABASE_SECRET_KEY; creates + deletes a temp user)
import { createClient } from '@supabase/supabase-js';

const { EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub, SUPABASE_SECRET_KEY: secret } = process.env;
if (!secret) throw new Error('set SUPABASE_SECRET_KEY in app/.env');
const admin = createClient(url, secret, { auth: { persistSession: false } });

const email = `latency-${Date.now()}@nuskha.test`;
const password = crypto.randomUUID();
const { error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (cErr) throw cErr;
const sb = createClient(url, pub, { auth: { persistSession: false } });

const results = [];
async function time(label, fn, runs = 5) {
  const ms = [];
  let out;
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    out = await fn(i);
    ms.push(performance.now() - t);
  }
  ms.sort((a, b) => a - b);
  results.push({ step: label, median_ms: Math.round(ms[Math.floor(ms.length / 2)]), max_ms: Math.round(ms.at(-1)), runs });
  return out;
}
const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

try {
  await time('login (password)', () => sb.auth.signInWithPassword({ email, password }).then(must), 3);

  const recipe = {
    title: 'Latency Dal', base_servings: 2, language: 'en', category: 'dal', is_veg: true, source: 'text', taught_by: 'Mom',
    ingredients: Array.from({ length: 12 }, (_, i) => ({ name: `ing ${i}`, qty: 1, unit: 'tsp', scale: 'linear' })),
    prep: [{ text: 'Soak the dal' }],
    steps: Array.from({ length: 10 }, (_, i) => ({ text: `Step ${i} of the recipe`, duration_sec: 60 })),
  };
  const ids = await time('save recipe (insert)', () => sb.from('recipes').insert(recipe).select('id').single().then(must).then((r) => r.id));
  // Fill up to ~50 recipes so the home list is realistic.
  must(await sb.from('recipes').insert(Array.from({ length: 45 }, () => recipe)));
  const id = ids;

  const COLUMNS = 'id, title, base_servings, category, is_veg, steps, ingredients, taught_by, is_favorite, last_cooked_at';
  const list = await time('home list (50 recipes)', () => sb.from('recipes').select(COLUMNS).order('created_at', { ascending: false }).then(must));
  results.at(-1).kb = Math.round(JSON.stringify(list).length / 1024);
  await time('open recipe (fetch one)', () => sb.from('recipes').select('*').eq('id', id).single().then(must));
  await time('favorite / cooked (update)', () => sb.from('recipes').update({ is_favorite: true }).eq('id', id).then(must));
  await time('profile last_seen (update)', async () => {
    const { data } = await sb.auth.getSession();
    return sb.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', data.session.user.id).then(must);
  });

  const text = 'Mummy ki dal 2 logon ke liye: 1 cup toor dal 3 cup paani mein 3 seeti pakao. Tadka: 1 chammach ghee, jeera, hing, 2 lal mirch. Namak aur haldi daalo.';
  await time('AI parse (parse-recipe)', async () => {
    const { data, error, response } = await sb.functions.invoke('parse-recipe', { body: { text, language: 'Same as input' } });
    if (error) throw new Error(`parse: ${error.message}`);
    const st = response?.headers?.get?.('server-timing');
    if (st) results.push({ step: '  └ server timing', note: st });
    return data;
  }, 2);
} finally {
  const { data } = await admin.auth.admin.listUsers();
  const u = data.users.find((x) => x.email === email);
  if (u) await admin.auth.admin.deleteUser(u.id); // cascades recipes/profile/ai_calls
}

console.table(results);
