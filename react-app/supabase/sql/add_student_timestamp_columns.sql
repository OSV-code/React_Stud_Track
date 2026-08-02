-- Run this after create_students_and_attendance.sql.
-- The students form in App.jsx sends camelCase createdAt/updatedAt fields on save.
alter table public.students add column if not exists "createdAt" timestamptz;
alter table public.students add column if not exists "updatedAt" timestamptz;
