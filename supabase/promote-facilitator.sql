update public.profiles
set role = 'facilitator'
where id = (
  select id
  from auth.users
  where email = 'facilitator@example.com'
);