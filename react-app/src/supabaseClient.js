import { createClient } from '@supabase/supabase-js'

// Replace these values with your Supabase project credentials.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getPasswordPolicy(userId) {
  const { data, error } = await supabase
    .from('password_policies')
    .select('password_expires_at, reset_required')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getUserProfileRole(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.role || 'teacher'
}

export async function adminSearchTeachers(searchTerm = '') {
  const { data, error } = await supabase.rpc('admin_search_teachers', {
    p_search: searchTerm
  })

  if (error) throw error
  return data || []
}

export async function adminSetTeacherPassword(teacherUserId, newPassword, validDays = 15) {
  const { data, error } = await supabase.rpc('admin_set_teacher_password', {
    p_teacher_user_id: teacherUserId,
    p_new_password: newPassword,
    p_valid_days: validDays
  })

  if (error) throw error
  return data
}

export async function requestPasswordReset(email) {
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function updateOwnPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('*').order('id', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addStudent(student) {
  const { data, error } = await supabase.from('students').insert([student])
  if (error) throw error
  return data
}

export async function updateStudent(id, student) {
  const { data, error } = await supabase.from('students').update(student).eq('id', id)
  if (error) throw error
  return data
}

export async function deleteStudent(id) {
  const { data, error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
  return data
}
