-- Notes table: free-text teacher notes per student.
create table if not exists public.notes (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  note_text text not null,
  note_date date not null,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

drop policy if exists "notes_owner_access" on public.notes;
create policy "notes_owner_access" on public.notes for all
  using (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  )
  with check (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

grant select, insert, update, delete on public.notes to authenticated;

create index if not exists notes_student_id_idx on public.notes (student_id);
