-- Login phase: one profile row per user + an owner-only view of who uses the app.
-- Email/phone/provider live in auth.users; everything else is derived from recipes.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  language text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- Owner "CRM": dashboard / SQL editor only. The admin schema is not exposed through the API.
create schema admin;
revoke all on schema admin from public, anon, authenticated;

create view admin.users as
select
  u.id,
  u.email,
  u.phone,
  u.raw_app_meta_data ->> 'provider' as provider,
  u.created_at,
  p.last_seen_at,
  p.language,
  count(r.id) as recipes,
  max(r.created_at) as last_recipe_at,
  array_remove(array_agg(distinct r.source), null) as sources
from auth.users u
left join public.profiles p on p.id = u.id
left join public.recipes r on r.user_id = u.id
group by u.id, p.id
order by u.created_at desc;
