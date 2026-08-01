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

export async function fetchAttendanceByDate(date) {
  const { data, error } = await supabase.from('attendance').select('*').eq('attendance_date', date)
  if (error) throw error
  return data || []
}

export async function fetchAllAttendance() {
  const { data, error } = await supabase.from('attendance').select('*')
  if (error) throw error
  return data || []
}

export async function saveAttendanceRecords(records) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,attendance_date' })
  if (error) throw error
  return data
}

const CLASSWORK_BUCKET = 'classwork-photos'

export async function fetchClassworkEntries() {
  const { data, error } = await supabase
    .from('classwork')
    .select('*')
    .order('classwork_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addClasswork({ className, subject, notes, classworkDate, photoFile }) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let photoPath = null
  if (photoFile) {
    const fileExt = photoFile.name.split('.').pop()
    photoPath = `${user.id}/${crypto.randomUUID()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from(CLASSWORK_BUCKET).upload(photoPath, photoFile)
    if (uploadError) throw uploadError
  }

  const { data, error } = await supabase.from('classwork').insert([
    {
      className,
      subject,
      notes,
      classwork_date: classworkDate,
      photo_path: photoPath
    }
  ])
  if (error) throw error
  return data
}

export async function deleteClasswork(entry) {
  if (entry.photo_path) {
    await supabase.storage.from(CLASSWORK_BUCKET).remove([entry.photo_path])
  }
  const { error } = await supabase.from('classwork').delete().eq('id', entry.id)
  if (error) throw error
}

export async function fetchAllMarks() {
  const { data, error } = await supabase.from('marks').select('*').order('exam_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addMark({ studentId, subject, examType, score, totalMarks, examDate }) {
  const { data, error } = await supabase.from('marks').insert([
    {
      student_id: studentId,
      subject,
      exam_type: examType,
      score,
      total_marks: totalMarks,
      exam_date: examDate
    }
  ])
  if (error) throw error
  return data
}

export async function deleteMark(id) {
  const { error } = await supabase.from('marks').delete().eq('id', id)
  if (error) throw error
}

export async function getClassworkPhotoUrl(photoPath) {
  if (!photoPath) return null
  const { data, error } = await supabase.storage.from(CLASSWORK_BUCKET).createSignedUrl(photoPath, 60 * 60)
  if (error) throw error
  return data?.signedUrl || null
}
