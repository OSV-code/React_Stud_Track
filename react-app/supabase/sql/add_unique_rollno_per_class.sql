-- Run this in Supabase SQL Editor.
-- Ensures a teacher cannot create two students with the same roll number in the same class.
-- Uses trimmed values so accidental spaces do not bypass the rule.

create unique index if not exists students_teacher_class_roll_unique
  on public.students (teacher_user_id, lower(trim("className")), lower(trim("rollNo")));
