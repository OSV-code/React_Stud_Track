-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query).
--
-- Purpose: replace the separate "teacher PIN" table/RPCs with a single flow
-- where the admin-issued PIN IS the teacher's real Supabase Auth password.
--
-- Confirmed actual schema:
--   public.user_profiles(user_id uuid pk, full_name text, role text, is_active boolean, created_at, updated_at)
--     (no email column here -- email lives on auth.users)
--   public.password_policies(user_id uuid pk, password_set_at timestamptz, password_expires_at timestamptz,
--                             reset_required boolean, reset_reason text, updated_by uuid, updated_at timestamptz)

-- pgcrypto is required for crypt()/gen_salt() used to hash the new password
-- the same way Supabase Auth (GoTrue) does.
create extension if not exists pgcrypto with schema extensions;

-- Drop the old PIN-only objects (safe no-ops if they don't exist).
drop function if exists public.teacher_verify_pin(text);
drop function if exists public.admin_set_teacher_pin(uuid, text, integer);

-- Must drop first: return row type (OUT params) is changing from the old
-- pin_expires_at shape to password_expires_at, and CREATE OR REPLACE cannot
-- alter an existing function's return type.
drop function if exists public.admin_search_teachers(text);

-- Admin-only: set a teacher's real login password (the "PIN") and (re)issue
-- an expiry window. Teachers can never call this for themselves because it
-- checks the caller's role in user_profiles.
create or replace function public.admin_set_teacher_password(
  p_teacher_user_id uuid,
  p_new_password text,
  p_valid_days integer default 15
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller_role text;
begin
  select role into v_caller_role
  from public.user_profiles
  where user_id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    raise exception 'Only admin can set a teacher password/PIN.';
  end if;

  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'PIN/password must be at least 6 characters.';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_teacher_user_id;

  if not found then
    raise exception 'Teacher account not found.';
  end if;

  insert into public.password_policies (user_id, password_set_at, password_expires_at, reset_required, updated_by, updated_at)
  values (
    p_teacher_user_id,
    now(),
    now() + (greatest(p_valid_days, 1) || ' days')::interval,
    false,
    auth.uid(),
    now()
  )
  on conflict (user_id) do update
    set password_set_at = excluded.password_set_at,
        password_expires_at = excluded.password_expires_at,
        reset_required = false,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.admin_set_teacher_password(uuid, text, integer) to authenticated;

-- Admin-only: search teachers, returning current password/PIN expiry instead
-- of a separate pin_expires_at column.
create or replace function public.admin_search_teachers(p_search text default '')
returns table (
  teacher_user_id uuid,
  email text,
  full_name text,
  password_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
begin
  select role into v_caller_role
  from public.user_profiles
  where user_id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    raise exception 'Only admin can search teachers.';
  end if;

  return query
  select up.user_id, au.email::text, up.full_name::text, pp.password_expires_at
  from public.user_profiles up
  join auth.users au on au.id = up.user_id
  left join public.password_policies pp on pp.user_id = up.user_id
  where up.role = 'teacher'
    and (
      p_search = '' or p_search is null
      or au.email ilike '%' || p_search || '%'
      or up.full_name ilike '%' || p_search || '%'
    )
  order by au.email;
end;
$$;

grant execute on function public.admin_search_teachers(text) to authenticated;
