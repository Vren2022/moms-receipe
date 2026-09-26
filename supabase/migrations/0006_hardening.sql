-- Clients write recipes directly (RLS keeps them to their own rows), so the DB caps shape and size:
-- a modified client can't store non-array JSON the app would crash on, or huge rows.
alter table public.recipes
  add constraint recipes_json_arrays check (
    jsonb_typeof(ingredients) = 'array' and jsonb_typeof(steps) = 'array' and jsonb_typeof(prep) = 'array'),
  add constraint recipes_json_size check (
    pg_column_size(ingredients) + pg_column_size(steps) + pg_column_size(prep) <= 200000),
  add constraint recipes_text_size check (
    length(title) <= 200 and coalesce(length(raw_input), 0) <= 20000 and coalesce(length(notes), 0) <= 5000
    and coalesce(length(taught_by), 0) <= 100 and coalesce(length(source_url), 0) <= 2000);

alter table public.profiles
  add constraint profiles_language_size check (coalesce(length(language), 0) <= 50);

-- Same limit as 0005, plus prune the caller's rows older than the window so ai_calls stays small.
create or replace function public.claim_ai_call() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  delete from public.ai_calls where user_id = uid and created_at <= now() - interval '24 hours';
  if (select count(*) from public.ai_calls where user_id = uid) >= 30 then
    return false;
  end if;
  insert into public.ai_calls (user_id) values (uid);
  return true;
end $$;
