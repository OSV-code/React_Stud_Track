-- Behavior assessments: discipline/confidence/communication/leadership ratings (out of 5) per student.
create table if not exists public.behavior_assessments (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  discipline numeric not null,
  confidence numeric not null,
  communication numeric not null,
  leadership numeric not null,
  assessment_date date not null,
  created_at timestamptz not null default now()
);

alter table public.behavior_assessments enable row level security;

drop policy if exists "behavior_owner_access" on public.behavior_assessments;
create policy "behavior_owner_access" on public.behavior_assessments for all
  using (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  )
  with check (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

grant select, insert, update, delete on public.behavior_assessments to authenticated;

create index if not exists behavior_assessments_student_id_idx on public.behavior_assessments (student_id);
