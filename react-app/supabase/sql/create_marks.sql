-- Marks table: one entry per student/subject/exam, scored against a total.
create table if not exists public.marks (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject text not null,
  exam_type text not null,
  score numeric not null,
  total_marks numeric not null default 100,
  exam_date date not null,
  created_at timestamptz not null default now()
);

alter table public.marks enable row level security;

drop policy if exists "marks_owner_access" on public.marks;
create policy "marks_owner_access" on public.marks for all
  using (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  )
  with check (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

grant select, insert, update, delete on public.marks to authenticated;

create index if not exists marks_student_id_idx on public.marks (student_id);
