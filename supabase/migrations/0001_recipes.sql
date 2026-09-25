create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  source text not null default 'text' check (source in ('text', 'voice', 'youtube')),
  source_url text,
  raw_input text,
  language text,
  base_servings int not null check (base_servings > 0),
  prep jsonb not null default '[]',
  ingredients jsonb not null,
  steps jsonb not null,
  notes text,
  created_at timestamptz not null default now()
);

create index recipes_user_created on public.recipes (user_id, created_at desc);

alter table public.recipes enable row level security;

-- Anonymous users sign in with the `authenticated` role.
create policy "own recipes" on public.recipes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
