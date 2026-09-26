-- Name comes from sign-up (user_metadata.name) or Google (full_name). New columns must go last in `create or replace view`.
create or replace view admin.users as
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
  array_remove(array_agg(distinct r.source), null) as sources,
  coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name') as name
from auth.users u
left join public.profiles p on p.id = u.id
left join public.recipes r on r.user_id = u.id
group by u.id, p.id
order by u.created_at desc;
