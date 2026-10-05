create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  display_name text not null,
  role text not null default 'student' check (role in ('student', 'facilitator')),
  primary key (id)
);

create table public.assignments (
  id text primary key,
  title text not null,
  instructions text not null,
  due_at timestamptz not null,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.assignments enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.assignments from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select, insert on table public.assignments to authenticated;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Authenticated users can view assignments"
on public.assignments
for select
to authenticated
using (true);

create policy "Authenticated users can create assignments"
on public.assignments
for insert
to authenticated
with check ((select auth.uid()) = created_by);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Learner'),
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();