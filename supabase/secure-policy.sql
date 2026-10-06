delete from public.assignments
where title = 'Student permission probe';

drop policy "Authenticated users can create assignments"
on public.assignments;

create policy "Facilitators can create assignments"
on public.assignments
for insert
to authenticated
with check (
  (select auth.uid()) = created_by
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'facilitator'
  )
);