-- Run this in Supabase SQL Editor.
-- Creates the students table (matches the camelCase keys used by react-app/src/App.jsx)
-- and the attendance table, both scoped per-teacher via Row Level Security.

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- STUDENTS
-- ============================================================
create table if not exists public.students (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  "rollNo" text,
  "className" text,
  "fatherName" text,
  "motherName" text,
  "parentPhone" text,
  address text,
  dob date,
  "bloodGroup" text,
  "admissionNo" text,
  "aadharNumber" text,
  "saralPortalNumber" text,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

drop policy if exists "students_owner_access" on public.students;
create policy "students_owner_access" on public.students
  for all
  using (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  )
  with check (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

grant select, insert, update, delete on public.students to authenticated;

-- ============================================================
-- ATTENDANCE
-- ============================================================
create table if not exists public.attendance (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('Present', 'Absent', 'Late')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

alter table public.attendance enable row level security;

drop policy if exists "attendance_owner_access" on public.attendance;
create policy "attendance_owner_access" on public.attendance
  for all
  using (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  )
  with check (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

grant select, insert, update, delete on public.attendance to authenticated;
