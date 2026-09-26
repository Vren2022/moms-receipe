// Raw recipe text (any Indian language) -> recipe JSON (see AGENTS.md contract).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

const MODEL = 'google/gemini-3.8-flash'; // audio-capable too, reused in Phase 3

// Mirror of LANGUAGES in app/src/lib/labels.ts. Allow-listed because it goes into the system prompt.
const LANGUAGES = ['Same as input', 'English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu', 'Bengali'];

// Mirror of app/src/lib/recipeSchema.ts — change both together.
const Recipe = z.object({
  title: z.string().min(1),
  category: z.enum(['sabzi', 'dal', 'rice', 'roti', 'snack', 'sweet', 'drink', 'other']).catch('other'),
  is_veg: z.boolean().nullish(),
  base_servings: z.number().int().positive(),
  language: z.string(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().positive().nullable(),
        unit: z.string().default(''),
        scale: z.enum(['linear', 'partial', 'to_taste']),
      }),
    )
    .min(1),
  prep: z.array(z.object({ text: z.string().min(1) })).default([]),
  steps: z
    .array(
      z.object({
        text: z.string().min(1),
        duration_sec: z.number().int().nonnegative().nullish(),
        heat: z.enum(['low', 'medium', 'high']).nullish(),
      }),
    )
    .min(1),
});

const prompt = (language: string) => `You turn home-cooking instructions (often spoken by a mother, informal, any Indian language or mixed like Hinglish) into a structured recipe.

Return ONLY a JSON object:
{"title": string, "category": "sabzi"|"dal"|"rice"|"roti"|"snack"|"sweet"|"drink"|"other", "is_veg": boolean, "base_servings": int, "language": string,
 "ingredients": [{"name": string, "qty": number|null, "unit": string, "scale": "linear"|"partial"|"to_taste"}],
 "prep": [{"text": string}],
 "steps": [{"text": string, "duration_sec": int|null, "heat": "low"|"medium"|"high"|null}]}

Rules:
- Keep the cook's ORDER exactly. Split into one action per step.
- Step and prep text name ingredients WITHOUT amounts ("Heat the oil", not "Heat 3 tbsp oil") — amounts live only in "ingredients" so they can be scaled.
- "prep": everything to do before the stove goes on (chop, soak, grind, marinate). Soaking/marinating times go in the text.
- base_servings: the number of people mentioned; if none, 2.
- qty is a number (½ -> 0.5). Vague amounts ("thoda", "a pinch", "as needed") -> your best realistic estimate for base_servings; use null only if truly unknowable. Units: tsp, tbsp, cup, g, kg, ml, l, pc, pinch, clove, inch.
- scale: vegetables/dal/rice/flour/water/paneer -> "linear"; oil, ghee, whole & powdered spices, ginger-garlic, chillies -> "partial"; salt, sugar-to-taste, garnish -> "to_taste".
- duration_sec: from explicit times, or a realistic estimate for cues like "until golden" (onions golden ~ 300). null if instant.
- category: the dish type (curries with meat/egg go under the closest type, e.g. "sabzi"). is_veg: false if it contains meat, fish or egg.
- Do not invent ingredients that were not mentioned, except salt/water when clearly implied.
- Output language for all text (title, names, steps): ${language === 'Same as input' ? 'the same language and script as the input' : language}. Put it in "language" as an ISO code.`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // verify_jwt also accepts the public anon key; require a real signed-in user so the key can't burn AI credit.
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return json({ error: 'sign in required' }, 401);

  const { text, language = 'Same as input' } = await req.json().catch(() => ({}));
  if (typeof text !== 'string' || !text.trim()) return json({ error: 'text is required' }, 400);
  if (text.length > 20000) return json({ error: 'text too long' }, 413);
  if (!LANGUAGES.includes(language)) return json({ error: 'unknown language' }, 400);

  // 30 AI calls per user per 24h (counted in the DB as this user; see migration 0005).
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: allowed, error: limitErr } = await asUser.rpc('claim_ai_call');
  if (limitErr) return json({ error: `limit check failed: ${limitErr.message}` }, 500);
  if (!allowed) return json({ error: 'daily limit reached' }, 429);

  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) return json({ error: 'OPENROUTER_API_KEY secret is not set on the Supabase project' }, 500);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt(language) },
        { role: 'user', content: text },
      ],
    }),
    signal: AbortSignal.timeout(60_000), // don't leave the user on a spinner if the provider hangs
  }).catch((e) => {
    console.error('openrouter fetch', e);
    return null;
  });
  if (!res) return json({ error: 'AI timed out' }, 504);
  if (!res.ok) {
    console.error('openrouter', res.status, await res.text()); // details stay in function logs, not the client
    return json({ error: `AI error ${res.status}` }, 502);
  }

  const content: string = (await res.json()).choices?.[0]?.message?.content ?? '';
  let raw: unknown;
  try {
    raw = JSON.parse(content.replace(/^```(json)?\s*|\s*```$/g, ''));
  } catch {
    return json({ error: 'AI returned non-JSON' }, 422);
  }
  const parsed = Recipe.safeParse(raw);
  if (!parsed.success) return json({ error: 'AI returned invalid recipe', issues: parsed.error.issues }, 422);
  return json(parsed.data);
});
