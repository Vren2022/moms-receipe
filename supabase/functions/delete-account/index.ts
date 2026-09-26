// Deletes the calling user. Recipes and profile go with it (on delete cascade). Required by App Store / Play Store.
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return json({ error: 'sign in required' }, 401);

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
