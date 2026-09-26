-- Per-user AI budget: parse-recipe calls claim_ai_call() with the user's JWT before calling OpenRouter.
create table public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index ai_calls_user_created on public.ai_calls (user_id, created_at);

-- No policies: rows are only written by claim_ai_call().
alter table public.ai_calls enable row level security;

-- Rolling 24h window. Advisory lock makes check+insert atomic per user (no double-tap overshoot).
create function public.claim_ai_call() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  if (select count(*) from public.ai_calls where user_id = uid and created_at > now() - interval '24 hours') >= 30 then
    return false;
  end if;
  insert into public.ai_calls (user_id) values (uid);
  return true;
end $$;
revoke execute on function public.claim_ai_call() from public, anon;
grant execute on function public.claim_ai_call() to authenticated;
