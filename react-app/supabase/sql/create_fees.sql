-- Fee tracking: one fee_record per student (totals + next installment config),
-- plus a fee_payments history table. totalPaid/remaining/status are NOT stored;
-- they are derived from fee_payments at read time in the app.
create table if not exists public.fee_records (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  teacher_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  total_fee numeric not null default 0 check (total_fee >= 0),
  next_installment_amount numeric check (next_installment_amount is null or next_installment_amount >= 0),
  next_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fee_records enable row level security;

drop policy if exists "fee_records_owner_access" on public.fee_records;
create policy "fee_records_owner_access" on public.fee_records for all
  using (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  )
  with check (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

grant select, insert, update, delete on public.fee_records to authenticated;

create index if not exists fee_records_student_id_idx on public.fee_records (student_id);

create table if not exists public.fee_payments (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_date date not null,
  created_at timestamptz not null default now()
);

alter table public.fee_payments enable row level security;

drop policy if exists "fee_payments_owner_access" on public.fee_payments;
create policy "fee_payments_owner_access" on public.fee_payments for all
  using (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  )
  with check (
    teacher_user_id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')
  );

grant select, insert, update, delete on public.fee_payments to authenticated;

create index if not exists fee_payments_student_id_idx on public.fee_payments (student_id);
