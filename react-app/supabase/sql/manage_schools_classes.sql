-- Run after the existing user_profiles and students migrations.
-- Adds the admin-managed school/class/division catalog without removing legacy text fields.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.schools (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists schools_normalized_name_unique
  on public.schools (normalized_name);

create table if not exists public.school_classes (
  id uuid primary key default extensions.gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, normalized_name)
);

create table if not exists public.class_divisions (
  id uuid primary key default extensions.gen_random_uuid(),
  class_id uuid not null references public.school_classes(id) on delete cascade,
  name text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_id, normalized_name)
);

alter table public.user_profiles
  add column if not exists school_id uuid references public.schools(id) on delete set null;

alter table public.students
  add column if not exists school_id uuid references public.schools(id) on delete set null,
  add column if not exists class_id uuid references public.school_classes(id) on delete set null,
  add column if not exists division_id uuid references public.class_divisions(id) on delete set null;

drop policy if exists "students_owner_access" on public.students;
create policy "students_owner_access" on public.students
  for all using (
    (
      teacher_user_id = auth.uid()
      and (
        school_id is null
        or school_id = (select up.school_id from public.user_profiles up where up.user_id = auth.uid())
      )
    )
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  ) with check (
    (
      teacher_user_id = auth.uid()
      and (
        school_id is null
        or school_id = (select up.school_id from public.user_profiles up where up.user_id = auth.uid())
      )
    )
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

alter table public.schools enable row level security;
alter table public.school_classes enable row level security;
alter table public.class_divisions enable row level security;

drop policy if exists "schools_admin_or_assigned_access" on public.schools;
create policy "schools_admin_or_assigned_access" on public.schools
  for all using (
    exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
    or id = (select up.school_id from public.user_profiles up where up.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

drop policy if exists "school_classes_admin_or_assigned_access" on public.school_classes;
create policy "school_classes_admin_or_assigned_access" on public.school_classes
  for all using (
    exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
    or school_id = (select up.school_id from public.user_profiles up where up.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

drop policy if exists "class_divisions_admin_or_assigned_access" on public.class_divisions;
create policy "class_divisions_admin_or_assigned_access" on public.class_divisions
  for all using (
    exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
    or exists (
      select 1
      from public.school_classes sc
      join public.user_profiles up on up.school_id = sc.school_id
      where sc.id = class_divisions.class_id and up.user_id = auth.uid()
    )
  ) with check (
    exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

grant select, insert, update, delete on public.schools to authenticated;
grant select, insert, update, delete on public.school_classes to authenticated;
grant select, insert, update, delete on public.class_divisions to authenticated;

create index if not exists students_school_class_division_idx
  on public.students (school_id, class_id, division_id);

-- Seed the requested defaults for each school created later through the admin UI.
create or replace function public.seed_school_classes(p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admin can seed school classes.';
  end if;

  insert into public.school_classes (school_id, name, sort_order)
  select p_school_id, ordinal::text || case when ordinal = 1 then 'st' when ordinal = 2 then 'nd' when ordinal = 3 then 'rd' else 'th' end, ordinal
  from generate_series(1, 10) as ordinal
  on conflict (school_id, normalized_name) do nothing;
end;
$$;

grant execute on function public.seed_school_classes(uuid) to authenticated;

create or replace function public.admin_set_teacher_school(
  p_teacher_user_id uuid,
  p_school_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admin can assign teachers to schools.';
  end if;

  if p_school_id is not null and not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'School not found.';
  end if;

  update public.user_profiles
  set school_id = p_school_id, updated_at = now()
  where user_id = p_teacher_user_id and role = 'teacher';

  if not found then
    raise exception 'Teacher profile not found.';
  end if;
end;
$$;

grant execute on function public.admin_set_teacher_school(uuid, uuid) to authenticated;