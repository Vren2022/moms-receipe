-- Organizing recipes: who taught it, dish type, veg, favorites, recently cooked.
alter table public.recipes
  add column taught_by text,
  add column category text,
  add column is_veg boolean,
  add column is_favorite boolean not null default false,
  add column last_cooked_at timestamptz;
