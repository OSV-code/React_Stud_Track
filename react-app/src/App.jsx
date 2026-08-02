import { useEffect, useMemo, useState } from 'react'
import {
  supabase,
  fetchStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  getPasswordPolicy,
  getUserProfileRole,
  adminSearchTeachers,
  adminSetTeacherPassword,
  requestPasswordReset,
  updateOwnPassword,
  fetchAttendanceByDate,
  fetchAllAttendance,
  saveAttendanceRecords,
  fetchClassworkEntries,
  addClasswork,
  deleteClasswork,
  getClassworkPhotoUrl,
  fetchAllMarks,
  addMark,
  deleteMark,
  fetchAllNotes,
  addNote,
  deleteNote,
  fetchAllBehavior,
  addBehavior,
  deleteBehavior
} from './supabaseClient'
import {
  downloadClassPdfReport,
  downloadClassExcelReport,
  downloadStudentPdfReport,
  downloadJsonBackup,
  shareStudentReportOnWhatsApp
} from './reportUtils'
import { downloadClassworkPdf, shareClassworkOnWhatsApp } from './classworkUtils'
import './App.css'

function getTodayDateString() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function marksPercent(score, total) {
  if (!total) return 0
  return Math.round((Number(score) / Number(total)) * 100)
}

function marksTier(percent) {
  if (percent < 40) return 'low'
  if (percent < 75) return 'mid'
  return 'high'
}

const initialStudentForm = {
  id: null,
  name: '',
  rollNo: '',
  className: '',
  fatherName: '',
  motherName: '',
  parentPhone: '',
  address: '',
  dob: '',
  bloodGroup: '',
  admissionNo: '',
  aadharNumber: '',
  saralPortalNumber: ''
}

const initialClassworkForm = {
  classworkDate: getTodayDateString(),
  className: '',
  subject: '',
  notes: '',
  photoFile: null
}

const initialMarksForm = {
  classFilter: 'all',
  studentId: '',
  subject: '',
  examType: 'Unit Test',
  score: '',
  totalMarks: '100',
  examDate: getTodayDateString()
}

const initialNotesForm = {
  classFilter: 'all',
  studentId: '',
  noteText: '',
  noteDate: getTodayDateString()
}

const initialBehaviorForm = {
  classFilter: 'all',
  studentId: '',
  discipline: '3',
  confidence: '3',
  communication: '3',
  leadership: '3',
  assessmentDate: getTodayDateString()
}

function App() {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname === '/admin'
  const isAdminLoginRoute = typeof window !== 'undefined' && window.location.pathname === '/adminlogin'
  const isClassworkRoute = typeof window !== 'undefined' && window.location.pathname === '/classwork'
  const isMarksRoute = typeof window !== 'undefined' && window.location.pathname === '/marks'
  const isNotesRoute = typeof window !== 'undefined' && window.location.pathname === '/notes'
  const isBehaviorRoute = typeof window !== 'undefined' && window.location.pathname === '/behavior'
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState('teacher')
  const [authLoading, setAuthLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [fullName, setFullName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [accessChecked, setAccessChecked] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('')
  const [recoverySubmitting, setRecoverySubmitting] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [changePasswordValue, setChangePasswordValue] = useState('')
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('')
  const [changePasswordSubmitting, setChangePasswordSubmitting] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')
  const [changePasswordNotice, setChangePasswordNotice] = useState('')
  const [teacherSearch, setTeacherSearch] = useState('')
  const [teacherList, setTeacherList] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [newTeacherPassword, setNewTeacherPassword] = useState('')
  const [passwordValidDays, setPasswordValidDays] = useState(15)
  const [adminError, setAdminError] = useState('')
  const [adminNotice, setAdminNotice] = useState('')
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(initialStudentForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [attendanceDate, setAttendanceDate] = useState(getTodayDateString())
  const [attendanceClassFilter, setAttendanceClassFilter] = useState('all')
  const [attendanceIndex, setAttendanceIndex] = useState(0)
  const [attendanceDraft, setAttendanceDraft] = useState({})
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceSaving, setAttendanceSaving] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const [attendanceNotice, setAttendanceNotice] = useState('')
  const [allAttendance, setAllAttendance] = useState([])
  const [reportClassFilter, setReportClassFilter] = useState('all')
  const [reportsError, setReportsError] = useState('')
  const [classworkForm, setClassworkForm] = useState(initialClassworkForm)
  const [classworkEntries, setClassworkEntries] = useState([])
  const [classworkClassFilter, setClassworkClassFilter] = useState('all')
  const [classworkPhotoUrls, setClassworkPhotoUrls] = useState({})
  const [classworkLoading, setClassworkLoading] = useState(false)
  const [classworkSaving, setClassworkSaving] = useState(false)
  const [classworkError, setClassworkError] = useState('')
  const [classworkNotice, setClassworkNotice] = useState('')
  const [marksForm, setMarksForm] = useState(initialMarksForm)
  const [marksEntries, setMarksEntries] = useState([])
  const [marksClassFilter, setMarksClassFilter] = useState('all')
  const [marksLoading, setMarksLoading] = useState(false)
  const [marksSaving, setMarksSaving] = useState(false)
  const [marksError, setMarksError] = useState('')
  const [marksNotice, setMarksNotice] = useState('')
  const [notesForm, setNotesForm] = useState(initialNotesForm)
  const [notesEntries, setNotesEntries] = useState([])
  const [notesClassFilter, setNotesClassFilter] = useState('all')
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesError, setNotesError] = useState('')
  const [notesNotice, setNotesNotice] = useState('')
  const [behaviorForm, setBehaviorForm] = useState(initialBehaviorForm)
  const [behaviorEntries, setBehaviorEntries] = useState([])
  const [behaviorClassFilter, setBehaviorClassFilter] = useState('all')
  const [behaviorLoading, setBehaviorLoading] = useState(false)
  const [behaviorSaving, setBehaviorSaving] = useState(false)
  const [behaviorError, setBehaviorError] = useState('')
  const [behaviorNotice, setBehaviorNotice] = useState('')

  useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession()

      if (isMounted) {
        setSession(currentSession)
        setAuthLoading(false)
      }
    }

    bootstrapSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession)
      setAuthLoading(false)

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session) {
      validateSessionAndLoad()
    } else {
      setAccessChecked(false)
    }
  }, [session])

  useEffect(() => {
    if (session && accessChecked) {
      loadStudents()
    }
  }, [session, accessChecked])

  useEffect(() => {
    if (session && userRole === 'admin' && isAdminRoute) {
      loadTeachers()
    }
  }, [session, userRole, isAdminRoute])

  useEffect(() => {
    if (session && accessChecked && students.length > 0) {
      loadAttendanceForDate(attendanceDate)
    }
  }, [session, accessChecked, students, attendanceDate])

  useEffect(() => {
    setAttendanceIndex(0)
  }, [attendanceClassFilter, attendanceDate])

  useEffect(() => {
    if (session && accessChecked && students.length > 0) {
      loadAllAttendance()
    }
  }, [session, accessChecked, students])

  useEffect(() => {
    if (session && accessChecked) {
      loadClasswork()
    }
  }, [session, accessChecked])

  useEffect(() => {
    if (session && accessChecked) {
      loadMarks()
    }
  }, [session, accessChecked])

  useEffect(() => {
    if (session && accessChecked) {
      loadNotes()
    }
  }, [session, accessChecked])

  useEffect(() => {
    if (session && accessChecked) {
      loadBehavior()
    }
  }, [session, accessChecked])

  useEffect(() => {
    let isCancelled = false

    async function loadPhotoUrls() {
      const entries = classworkEntries.filter((entry) => entry.photo_path && !classworkPhotoUrls[entry.id])
      if (entries.length === 0) return

      const results = await Promise.all(
        entries.map(async (entry) => {
          try {
            const url = await getClassworkPhotoUrl(entry.photo_path)
            return [entry.id, url]
          } catch {
            return [entry.id, null]
          }
        })
      )

      if (!isCancelled) {
        setClassworkPhotoUrls((prev) => ({ ...prev, ...Object.fromEntries(results) }))
      }
    }

    loadPhotoUrls()

    return () => {
      isCancelled = true
    }
  }, [classworkEntries])

  async function validateSessionAndLoad() {
    setAccessChecked(false)

    try {
      const role = await getUserProfileRole(session.user.id)
      setUserRole(role)

      // Admins are not subject to the PIN/trial expiry gate -- that gate exists
      // only to control teacher access. There is no one above admin to reissue
      // their PIN, so admin access relies solely on their own login password
      // (recoverable via Forgot Password / Change Password).
      if (role === 'admin') {
        setAccessChecked(true)
        return
      }

      const policy = await getPasswordPolicy(session.user.id)

      if (!policy) {
        await supabase.auth.signOut()
        setAuthMode('login')
        setAuthError('Access not set up yet. Ask admin to issue your login PIN.')
        return
      }

      const expiresAt = new Date(policy.password_expires_at)
      const isExpired = Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()

      if (policy.reset_required || isExpired) {
        await supabase.auth.signOut()
        setAuthMode('login')
        setAuthPassword('')
        setAuthError('Your access has expired. Ask admin to issue a new PIN.')
        return
      }

      setAccessChecked(true)
    } catch (err) {
      const message = String(err?.message || '')

      if (message.toLowerCase().includes('row-level security')) {
        await supabase.auth.signOut()
        setAuthMode('login')
        setAuthError('Access denied to password policy table. Add RLS select policy for the logged-in user.')
        return
      }

      await supabase.auth.signOut()
      setAuthMode('login')
      setAuthError(err.message || 'Session validation failed. Please sign in again.')
    }
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (!authEmail || !authPassword) {
      setAuthError('Email and password are required.')
      return
    }

    setAuthSubmitting(true)
    setAuthError('')
    setAuthNotice('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    })

    if (signInError) {
      setAuthError(signInError.message)
    }

    setAuthSubmitting(false)
  }

  async function handleRequestPasswordReset() {
    if (!authEmail) {
      setAuthError('Enter your email above first, then click "Forgot password?".')
      return
    }

    setAuthSubmitting(true)
    setAuthError('')
    setAuthNotice('')

    try {
      await requestPasswordReset(authEmail)
      setAuthNotice('Password reset email sent. Open the link in your inbox to set a new password.')
    } catch (err) {
      setAuthError(err.message || 'Unable to send password reset email.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleCompletePasswordRecovery(event) {
    event.preventDefault()

    if (!recoveryPassword || recoveryPassword.length < 6) {
      setRecoveryError('Password must be at least 6 characters.')
      return
    }

    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryError('Passwords do not match.')
      return
    }

    setRecoverySubmitting(true)
    setRecoveryError('')

    try {
      await updateOwnPassword(recoveryPassword)
      setPasswordRecovery(false)
      setRecoveryPassword('')
      setRecoveryConfirmPassword('')
    } catch (err) {
      setRecoveryError(err.message || 'Unable to update password.')
    } finally {
      setRecoverySubmitting(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()

    if (!changePasswordValue || changePasswordValue.length < 6) {
      setChangePasswordError('Password must be at least 6 characters.')
      return
    }

    if (changePasswordValue !== changePasswordConfirm) {
      setChangePasswordError('Passwords do not match.')
      return
    }

    setChangePasswordSubmitting(true)
    setChangePasswordError('')
    setChangePasswordNotice('')

    try {
      await updateOwnPassword(changePasswordValue)
      setChangePasswordNotice('Password updated successfully.')
      setChangePasswordValue('')
      setChangePasswordConfirm('')
    } catch (err) {
      setChangePasswordError(err.message || 'Unable to update password.')
    } finally {
      setChangePasswordSubmitting(false)
    }
  }

  async function handleSignUp(event) {
    event.preventDefault()

    if (!fullName || !authEmail) {
      setAuthError('Name and email are required for signup.')
      return
    }

    setAuthSubmitting(true)
    setAuthError('')
    setAuthNotice('')

    // Teachers never choose their own password. A random, unusable placeholder
    // is set here; admin later issues the real login PIN via Admin Setup, which
    // becomes the account's actual sign-in password.
    const placeholderPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`

    const { error: signUpError } = await supabase.auth.signUp({
      email: authEmail,
      password: placeholderPassword,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (signUpError) {
      setAuthError(signUpError.message)
      setAuthSubmitting(false)
      return
    }

    setAuthNotice('Account created. Contact your admin to receive your login PIN.')
    setAuthMode('login')
    setFullName('')
    setAuthSubmitting(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUserRole('teacher')
    setAccessChecked(false)
    setShowChangePassword(false)
    setChangePasswordValue('')
    setChangePasswordConfirm('')
    setChangePasswordError('')
    setChangePasswordNotice('')
    setTeacherList([])
    setSelectedTeacher(null)
    setAdminError('')
    setAdminNotice('')
    setStudents([])
    setError('')
    setSearch('')
    setSelectedClass('all')
  }

  async function loadTeachers() {
    setAdminLoading(true)
    setAdminError('')

    try {
      const teachers = await adminSearchTeachers(teacherSearch)
      setTeacherList(teachers)
    } catch (err) {
      setAdminError(err.message || 'Unable to load teachers')
    } finally {
      setAdminLoading(false)
    }
  }

  async function handleAdminSearch(event) {
    event.preventDefault()
    await loadTeachers()
  }

  async function handleSetTeacherPin(event) {
    event.preventDefault()

    if (!selectedTeacher) {
      setAdminError('Select a teacher first.')
      return
    }

    if (!newTeacherPassword || newTeacherPassword.length < 6) {
      setAdminError('PIN must be at least 6 characters.')
      return
    }

    setAdminError('')
    setAdminNotice('')
    setAdminLoading(true)

    try {
      const validDays = Number(passwordValidDays) || 15
      await adminSetTeacherPassword(selectedTeacher.teacher_user_id, newTeacherPassword, validDays)
      setAdminNotice(`PIN issued for ${selectedTeacher.email}`)
      setNewTeacherPassword('')
      await loadTeachers()
    } catch (err) {
      setAdminError(err.message || 'Unable to set teacher PIN')
    } finally {
      setAdminLoading(false)
    }
  }

  async function loadStudents() {
    setLoading(true)
    try {
      const data = await fetchStudents()
      setStudents(data)
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load students')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.name || !form.rollNo || !form.className) {
      setError('Name, Roll Number, and Class are required.')
      return
    }

    try {
      if (form.id) {
        const { id, ...studentPayload } = form
        await updateStudent(id, {
          ...studentPayload,
          updatedAt: new Date().toISOString()
        })
      } else {
        const { id, ...studentPayload } = form
        await addStudent({
          ...studentPayload,
          createdAt: new Date().toISOString()
        })
      }
      setForm(initialStudentForm)
      setError('')
      await loadStudents()
    } catch (err) {
      setError(err.message || 'Unable to save student')
    }
  }

  function handleEdit(student) {
    setForm(student)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this student permanently?')) return
    try {
      await deleteStudent(id)
      await loadStudents()
    } catch (err) {
      setError(err.message || 'Unable to delete student')
    }
  }

  async function loadAttendanceForDate(date) {
    setAttendanceLoading(true)
    setAttendanceError('')
    setAttendanceNotice('')

    try {
      const records = await fetchAttendanceByDate(date)
      const recordByStudentId = new Map(records.map((record) => [record.student_id, record.status]))

      const draft = {}
      students.forEach((student) => {
        // Empty string means "not marked yet" -- students must be explicitly
        // marked before they are saved, so an unreviewed student is never
        // silently written to the database as Present.
        draft[student.id] = recordByStudentId.get(student.id) || ''
      })
      setAttendanceDraft(draft)
    } catch (err) {
      setAttendanceError(err.message || 'Unable to load attendance for this date')
    } finally {
      setAttendanceLoading(false)
    }
  }

  function handleAttendanceStatusChange(studentId, status) {
    setAttendanceDraft((prev) => ({ ...prev, [studentId]: status }))
  }

  async function handleSaveAttendance() {
    setAttendanceSaving(true)
    setAttendanceError('')
    setAttendanceNotice('')

    try {
      const studentsToSave = attendanceStudents.filter((student) => attendanceDraft[student.id])

      if (studentsToSave.length === 0) {
        setAttendanceError("No changes to save. Mark a student's status first.")
        return
      }

      const records = studentsToSave.map((student) => ({
        student_id: student.id,
        attendance_date: attendanceDate,
        status: attendanceDraft[student.id]
      }))

      await saveAttendanceRecords(records)
      setAttendanceNotice(`Attendance saved for ${records.length} student(s).`)
      await loadAllAttendance()
    } catch (err) {
      setAttendanceError(err.message || 'Unable to save attendance')
    } finally {
      setAttendanceSaving(false)
    }
  }

  async function loadAllAttendance() {
    try {
      const records = await fetchAllAttendance()
      setAllAttendance(records)
    } catch (err) {
      setReportsError(err.message || 'Unable to load attendance data for reports')
    }
  }

  function getReportStudents() {
    return reportClassFilter === 'all' ? students : students.filter((student) => student.className === reportClassFilter)
  }

  function handleDownloadClassPdf() {
    setReportsError('')
    try {
      downloadClassPdfReport(getReportStudents(), allAttendance, reportClassFilter)
    } catch (err) {
      setReportsError(err.message || 'Unable to generate PDF report')
    }
  }

  function handleDownloadClassExcel() {
    setReportsError('')
    try {
      downloadClassExcelReport(getReportStudents(), allAttendance, reportClassFilter)
    } catch (err) {
      setReportsError(err.message || 'Unable to generate Excel report')
    }
  }

  function handleBackupJson() {
    setReportsError('')
    try {
      downloadJsonBackup(students, allAttendance)
    } catch (err) {
      setReportsError(err.message || 'Unable to generate backup')
    }
  }

  function handleDownloadStudentReport(student) {
    setReportsError('')
    try {
      downloadStudentPdfReport(student, allAttendance, marksEntries, notesEntries, behaviorEntries)
    } catch (err) {
      setReportsError(err.message || 'Unable to generate student report')
    }
  }

  function handleShareStudentWhatsApp(student) {
    setReportsError('')
    try {
      shareStudentReportOnWhatsApp(student, allAttendance, marksEntries, notesEntries, behaviorEntries)
    } catch (err) {
      setReportsError(err.message || 'Unable to share student report')
    }
  }

  async function loadClasswork() {
    setClassworkLoading(true)
    setClassworkError('')

    try {
      const entries = await fetchClassworkEntries()
      setClassworkEntries(entries)
    } catch (err) {
      setClassworkError(err.message || 'Unable to load classwork entries')
    } finally {
      setClassworkLoading(false)
    }
  }

  function handleClassworkFieldChange(field, value) {
    setClassworkForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveClasswork(e) {
    e.preventDefault()
    setClassworkError('')
    setClassworkNotice('')

    if (!classworkForm.classworkDate) {
      setClassworkError('Please select a date.')
      return
    }
    if (!classworkForm.className) {
      setClassworkError('Please select a class.')
      return
    }

    setClassworkSaving(true)

    try {
      await addClasswork(classworkForm)
      setClassworkForm(initialClassworkForm)
      setClassworkNotice('Classwork saved successfully.')
      await loadClasswork()
    } catch (err) {
      setClassworkError(err.message || 'Unable to save classwork')
    } finally {
      setClassworkSaving(false)
    }
  }

  async function handleDeleteClasswork(entry) {
    if (!window.confirm('Delete this classwork entry permanently?')) return

    try {
      await deleteClasswork(entry)
      await loadClasswork()
    } catch (err) {
      setClassworkError(err.message || 'Unable to delete classwork entry')
    }
  }

  async function handleDownloadClasswork(entry) {
    setClassworkError('')
    try {
      const photoUrl = classworkPhotoUrls[entry.id] || (entry.photo_path ? await getClassworkPhotoUrl(entry.photo_path) : null)
      await downloadClassworkPdf(entry, photoUrl)
    } catch (err) {
      setClassworkError(err.message || 'Unable to generate classwork PDF')
    }
  }

  async function handleShareClassworkWhatsApp(entry) {
    setClassworkError('')
    try {
      const photoUrl = classworkPhotoUrls[entry.id] || (entry.photo_path ? await getClassworkPhotoUrl(entry.photo_path) : null)
      await shareClassworkOnWhatsApp(entry, photoUrl)
    } catch (err) {
      setClassworkError(err.message || 'Unable to share classwork')
    }
  }

  async function loadMarks() {
    setMarksLoading(true)
    setMarksError('')

    try {
      const entries = await fetchAllMarks()
      setMarksEntries(entries)
    } catch (err) {
      setMarksError(err.message || 'Unable to load marks')
    } finally {
      setMarksLoading(false)
    }
  }

  function handleMarksFieldChange(field, value) {
    setMarksForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveMarks(e) {
    e.preventDefault()
    setMarksError('')
    setMarksNotice('')

    if (!marksForm.studentId) {
      setMarksError('Please select a student.')
      return
    }
    if (!marksForm.subject.trim()) {
      setMarksError('Please enter a subject.')
      return
    }
    if (marksForm.score === '' || marksForm.totalMarks === '') {
      setMarksError('Please enter score and total marks.')
      return
    }

    setMarksSaving(true)

    try {
      await addMark({
        studentId: marksForm.studentId,
        subject: marksForm.subject.trim(),
        examType: marksForm.examType,
        score: Number(marksForm.score),
        totalMarks: Number(marksForm.totalMarks),
        examDate: marksForm.examDate
      })
      setMarksForm((prev) => ({ ...initialMarksForm, classFilter: prev.classFilter, studentId: prev.studentId }))
      setMarksNotice('Marks saved successfully.')
      await loadMarks()
    } catch (err) {
      setMarksError(err.message || 'Unable to save marks')
    } finally {
      setMarksSaving(false)
    }
  }

  async function handleDeleteMark(entry) {
    if (!window.confirm('Delete this marks entry permanently?')) return

    try {
      await deleteMark(entry.id)
      await loadMarks()
    } catch (err) {
      setMarksError(err.message || 'Unable to delete marks entry')
    }
  }

  async function loadNotes() {
    setNotesLoading(true)
    setNotesError('')

    try {
      const entries = await fetchAllNotes()
      setNotesEntries(entries)
    } catch (err) {
      setNotesError(err.message || 'Unable to load notes')
    } finally {
      setNotesLoading(false)
    }
  }

  function handleNotesFieldChange(field, value) {
    setNotesForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveNote(e) {
    e.preventDefault()
    setNotesError('')
    setNotesNotice('')

    if (!notesForm.studentId) {
      setNotesError('Please select a student.')
      return
    }
    if (!notesForm.noteText.trim()) {
      setNotesError('Please enter a note.')
      return
    }

    setNotesSaving(true)

    try {
      await addNote({
        studentId: notesForm.studentId,
        noteText: notesForm.noteText.trim(),
        noteDate: notesForm.noteDate
      })
      setNotesForm((prev) => ({ ...initialNotesForm, classFilter: prev.classFilter, studentId: prev.studentId }))
      setNotesNotice('Note saved successfully.')
      await loadNotes()
    } catch (err) {
      setNotesError(err.message || 'Unable to save note')
    } finally {
      setNotesSaving(false)
    }
  }

  async function handleDeleteNote(entry) {
    if (!window.confirm('Delete this note permanently?')) return

    try {
      await deleteNote(entry.id)
      await loadNotes()
    } catch (err) {
      setNotesError(err.message || 'Unable to delete note')
    }
  }

  async function loadBehavior() {
    setBehaviorLoading(true)
    setBehaviorError('')

    try {
      const entries = await fetchAllBehavior()
      setBehaviorEntries(entries)
    } catch (err) {
      setBehaviorError(err.message || 'Unable to load behavior assessments')
    } finally {
      setBehaviorLoading(false)
    }
  }

  function handleBehaviorFieldChange(field, value) {
    setBehaviorForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveBehavior(e) {
    e.preventDefault()
    setBehaviorError('')
    setBehaviorNotice('')

    if (!behaviorForm.studentId) {
      setBehaviorError('Please select a student.')
      return
    }

    setBehaviorSaving(true)

    try {
      await addBehavior({
        studentId: behaviorForm.studentId,
        discipline: Number(behaviorForm.discipline),
        confidence: Number(behaviorForm.confidence),
        communication: Number(behaviorForm.communication),
        leadership: Number(behaviorForm.leadership),
        assessmentDate: behaviorForm.assessmentDate
      })
      setBehaviorForm((prev) => ({ ...initialBehaviorForm, classFilter: prev.classFilter, studentId: prev.studentId }))
      setBehaviorNotice('Behavior assessment saved successfully.')
      await loadBehavior()
    } catch (err) {
      setBehaviorError(err.message || 'Unable to save behavior assessment')
    } finally {
      setBehaviorSaving(false)
    }
  }

  async function handleDeleteBehavior(entry) {
    if (!window.confirm('Delete this behavior assessment permanently?')) return

    try {
      await deleteBehavior(entry.id)
      await loadBehavior()
    } catch (err) {
      setBehaviorError(err.message || 'Unable to delete behavior assessment')
    }
  }

  const classes = useMemo(() => {
    const set = new Set(students.map((student) => student.className).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [students])

  const attendanceStudents = useMemo(
    () =>
      students.filter(
        (student) => attendanceClassFilter === 'all' || student.className === attendanceClassFilter
      ),
    [students, attendanceClassFilter]
  )

  const currentAttendanceStudent = attendanceStudents[attendanceIndex] || null

  useEffect(() => {
    if (attendanceIndex > attendanceStudents.length - 1) {
      setAttendanceIndex(0)
    }
  }, [attendanceStudents, attendanceIndex])

  const filteredClassworkEntries = useMemo(
    () =>
      classworkClassFilter === 'all'
        ? classworkEntries
        : classworkEntries.filter((entry) => entry.className === classworkClassFilter),
    [classworkEntries, classworkClassFilter]
  )

  const studentsById = useMemo(() => {
    const map = new Map()
    students.forEach((student) => map.set(student.id, student))
    return map
  }, [students])

  const marksFormStudents = useMemo(
    () =>
      marksForm.classFilter === 'all'
        ? students
        : students.filter((student) => student.className === marksForm.classFilter),
    [students, marksForm.classFilter]
  )

  const marksEntriesWithStudent = useMemo(
    () =>
      marksEntries.map((entry) => ({
        ...entry,
        student: studentsById.get(entry.student_id) || null
      })),
    [marksEntries, studentsById]
  )

  const filteredMarksEntries = useMemo(
    () =>
      marksClassFilter === 'all'
        ? marksEntriesWithStudent
        : marksEntriesWithStudent.filter((entry) => entry.student?.className === marksClassFilter),
    [marksEntriesWithStudent, marksClassFilter]
  )

  const notesFormStudents = useMemo(
    () =>
      notesForm.classFilter === 'all'
        ? students
        : students.filter((student) => student.className === notesForm.classFilter),
    [students, notesForm.classFilter]
  )

  const notesEntriesWithStudent = useMemo(
    () =>
      notesEntries.map((entry) => ({
        ...entry,
        student: studentsById.get(entry.student_id) || null
      })),
    [notesEntries, studentsById]
  )

  const filteredNotesEntries = useMemo(
    () =>
      notesClassFilter === 'all'
        ? notesEntriesWithStudent
        : notesEntriesWithStudent.filter((entry) => entry.student?.className === notesClassFilter),
    [notesEntriesWithStudent, notesClassFilter]
  )

  const behaviorFormStudents = useMemo(
    () =>
      behaviorForm.classFilter === 'all'
        ? students
        : students.filter((student) => student.className === behaviorForm.classFilter),
    [students, behaviorForm.classFilter]
  )

  const behaviorEntriesWithStudent = useMemo(
    () =>
      behaviorEntries.map((entry) => ({
        ...entry,
        student: studentsById.get(entry.student_id) || null
      })),
    [behaviorEntries, studentsById]
  )

  const filteredBehaviorEntries = useMemo(
    () =>
      behaviorClassFilter === 'all'
        ? behaviorEntriesWithStudent
        : behaviorEntriesWithStudent.filter((entry) => entry.student?.className === behaviorClassFilter),
    [behaviorEntriesWithStudent, behaviorClassFilter]
  )

  const filteredStudents = students.filter((student) => {
    const matchesSearch = [student.name, student.rollNo, student.className]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesClass = selectedClass === 'all' || student.className === selectedClass
    return matchesSearch && matchesClass
  })

  const isStudentsTableMissing =
    typeof error === 'string' && error.toLowerCase().includes("could not find the table 'public.students'")

  if (authLoading) {
    return (
      <div className="app-shell auth-shell">
        <section className="panel auth-card">
          <p className="eyebrow">Teacher Intelligence</p>
          <h1>Checking session...</h1>
        </section>
      </div>
    )
  }

  if (passwordRecovery) {
    return (
      <div className="app-shell auth-shell">
        <section className="panel auth-card">
          <p className="eyebrow">Teacher Intelligence</p>
          <h1>Set a new password</h1>
          <p className="intro">Enter a new password to complete your account reset.</p>

          {recoveryError && <div className="alert error">{recoveryError}</div>}

          <form className="student-form" onSubmit={handleCompletePasswordRecovery}>
            <div className="field-grid">
              <div className="field-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={recoveryPassword}
                  onChange={(event) => setRecoveryPassword(event.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="field-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={recoveryConfirmPassword}
                  onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="button primary" disabled={recoverySubmitting}>
                {recoverySubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-shell auth-shell">
        <section className="panel auth-card">
          <p className="eyebrow">Teacher Intelligence</p>
          <h1>{isAdminLoginRoute ? 'Admin sign in' : authMode === 'login' ? 'Sign in' : 'Create first account'}</h1>
          <p className="intro">
            {isAdminLoginRoute
              ? 'Sign in with your admin account.'
              : authMode === 'login'
              ? 'Login required before accessing the student dashboard.'
              : 'Create initial credentials for admin/teacher access.'}
          </p>

          {authError && <div className="alert error">{authError}</div>}
          {authNotice && <div className="alert success">{authNotice}</div>}

          {isAdminLoginRoute || authMode === 'login' ? (
            <form className="student-form" onSubmit={handleLogin}>
              <div className="field-group">
                <label>Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="teacher@example.com"
                />
              </div>

              <div className="field-group">
                <label>Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Enter password"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="button primary" disabled={authSubmitting}>
                  {authSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
                {!isAdminLoginRoute && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setAuthMode('signup')
                      setAuthError('')
                      setAuthNotice('')
                    }}
                  >
                    First-time setup
                  </button>
                )}
                {isAdminLoginRoute && (
                  <button
                    type="button"
                    className="button tertiary"
                    onClick={handleRequestPasswordReset}
                    disabled={authSubmitting}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form className="student-form" onSubmit={handleSignUp}>
              <div className="field-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Teacher name"
                />
              </div>

              <div className="field-group">
                <label>Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="teacher@example.com"
                />
              </div>

              <p className="intro">
                No password needed here. After your account is created, contact your admin to receive your login PIN.
              </p>

              <div className="form-actions">
                <button type="submit" className="button primary" disabled={authSubmitting}>
                  {authSubmitting ? 'Creating account...' : 'Create account'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setAuthMode('login')
                    setAuthError('')
                    setAuthNotice('')
                  }}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    )
  }

  if (isAdminRoute) {
    return (
      <div className="app-shell auth-shell">
        <section className="panel auth-card">
          <p className="eyebrow">Teacher Intelligence</p>
          <h1>Admin Setup</h1>
          <p className="intro">Search teacher and set/renew PIN from this dedicated page.</p>

          {userRole !== 'admin' ? (
            <>
              <div className="alert error">
                This account is not admin. Ask admin to promote your role in user_profiles.
              </div>
              <div className="form-actions">
                <a href="/" className="button secondary" role="button">
                  Back to app
                </a>
                <button type="button" className="button tertiary" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="student-form">
              {adminError && <div className="alert error">{adminError}</div>}
              {adminNotice && <div className="alert success">{adminNotice}</div>}

              <form className="admin-search" onSubmit={handleAdminSearch}>
                <div className="field-group">
                  <label>Search teacher by email/name</label>
                  <input
                    value={teacherSearch}
                    onChange={(event) => setTeacherSearch(event.target.value)}
                    placeholder="teacher@example.com"
                  />
                </div>
                <button type="submit" className="button secondary" disabled={adminLoading}>
                  {adminLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div className="teacher-list">
                {teacherList.map((teacher) => (
                  <button
                    key={teacher.teacher_user_id}
                    type="button"
                    className={`teacher-row ${selectedTeacher?.teacher_user_id === teacher.teacher_user_id ? 'active' : ''}`}
                    onClick={() => setSelectedTeacher(teacher)}
                  >
                    <span>{teacher.email}</span>
                    <small>{teacher.full_name || 'No name'} | Expires: {teacher.password_expires_at || 'Not set'}</small>
                  </button>
                ))}
                {!teacherList.length && <p className="intro">No teachers found yet. Run search to load list.</p>}
              </div>

              <form className="student-form" onSubmit={handleSetTeacherPin}>
                <div className="field-group">
                  <label>New Teacher PIN</label>
                  <input
                    type="password"
                    value={newTeacherPassword}
                    onChange={(event) => setNewTeacherPassword(event.target.value)}
                    placeholder="Set new PIN"
                  />
                </div>

                <div className="field-group">
                  <label>Validity Days</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={passwordValidDays}
                    onChange={(event) => setPasswordValidDays(event.target.value)}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="button primary" disabled={adminLoading}>
                    Set PIN
                  </button>
                  <a href="/" className="button secondary" role="button">
                    Back to app
                  </a>
                </div>
              </form>

              <div className="panel-head" style={{ marginTop: '2rem' }}>
                <div>
                  <p className="eyebrow">My account</p>
                  <h2>Change my password</h2>
                </div>
                <button
                  type="button"
                  className="button tertiary"
                  onClick={() => {
                    setShowChangePassword((value) => !value)
                    setChangePasswordError('')
                    setChangePasswordNotice('')
                  }}
                >
                  {showChangePassword ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showChangePassword && (
                <form className="student-form" onSubmit={handleChangePassword}>
                  {changePasswordError && <div className="alert error">{changePasswordError}</div>}
                  {changePasswordNotice && <div className="alert success">{changePasswordNotice}</div>}

                  <div className="field-grid">
                    <div className="field-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={changePasswordValue}
                        onChange={(event) => setChangePasswordValue(event.target.value)}
                        placeholder="Min 6 characters"
                      />
                    </div>
                    <div className="field-group">
                      <label>Confirm Password</label>
                      <input
                        type="password"
                        value={changePasswordConfirm}
                        onChange={(event) => setChangePasswordConfirm(event.target.value)}
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="button primary" disabled={changePasswordSubmitting}>
                      {changePasswordSubmitting ? 'Updating...' : 'Update My Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    )
  }

  if (!accessChecked) {
    return (
      <div className="app-shell auth-shell">
        <section className="panel auth-card">
          <p className="eyebrow">Teacher Intelligence</p>
          <h1>Checking access...</h1>
        </section>
      </div>
    )
  }

  if (isClassworkRoute) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Teacher Intelligence</p>
            <h1>Classwork</h1>
          </div>
          <div className="header-actions">
            <span className="session-email">{session.user.email}</span>
            <a href="/" className="button secondary" role="button">
              Back to app
            </a>
            <button type="button" className="button tertiary" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main>
          <section className="panel panel-form">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Classwork</p>
                <h2>Add classwork entry</h2>
              </div>
            </div>

            <form className="student-form" onSubmit={handleSaveClasswork}>
              <div className="field-grid">
                <div className="field-group">
                  <label htmlFor="classworkDate">Date</label>
                  <input
                    id="classworkDate"
                    type="date"
                    value={classworkForm.classworkDate}
                    onChange={(e) => handleClassworkFieldChange('classworkDate', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="classworkClassName">Class</label>
                  <input
                    id="classworkClassName"
                    value={classworkForm.className}
                    onChange={(e) => handleClassworkFieldChange('className', e.target.value)}
                    placeholder="e.g. 8A"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="classworkSubject">Subject</label>
                  <input
                    id="classworkSubject"
                    value={classworkForm.subject}
                    onChange={(e) => handleClassworkFieldChange('subject', e.target.value)}
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="classworkPhoto">Photo (optional)</label>
                  <input
                    id="classworkPhoto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleClassworkFieldChange('photoFile', e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="classworkNotes">Notes / Instructions</label>
                <textarea
                  id="classworkNotes"
                  rows={3}
                  value={classworkForm.notes}
                  onChange={(e) => handleClassworkFieldChange('notes', e.target.value)}
                  placeholder="Optional notes for students or parents"
                />
              </div>

              {classworkError && <div className="alert error">{classworkError}</div>}
              {classworkNotice && <div className="alert notice">{classworkNotice}</div>}

              <div className="form-actions">
                <button type="submit" className="button primary" disabled={classworkSaving}>
                  {classworkSaving ? 'Saving...' : 'Save Classwork'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel panel-table">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Classwork gallery</p>
                <h2>Classwork history</h2>
              </div>
              <div className="filter-row">
                <select value={classworkClassFilter} onChange={(e) => setClassworkClassFilter(e.target.value)}>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className === 'all' ? 'All classes' : className}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {classworkLoading && <p className="empty-state">Loading classwork...</p>}

            {!classworkLoading && filteredClassworkEntries.length === 0 && (
              <p className="empty-state">No classwork entries yet. Add one above.</p>
            )}

            {!classworkLoading && filteredClassworkEntries.length > 0 && (
              <div className="classwork-gallery">
                {filteredClassworkEntries.map((entry) => (
                  <div className="classwork-card" key={entry.id}>
                    {classworkPhotoUrls[entry.id] && (
                      <img
                        className="classwork-photo"
                        src={classworkPhotoUrls[entry.id]}
                        alt={entry.subject || 'Classwork'}
                      />
                    )}
                    <p className="classwork-subject">{entry.subject || 'No Subject'}</p>
                    <p className="classwork-meta">
                      📅 {entry.classwork_date} | 📚 Class: {entry.className}
                    </p>
                    {entry.notes && <p className="classwork-notes">&quot;{entry.notes}&quot;</p>}
                    <div className="classwork-actions">
                      <button className="button tertiary" onClick={() => handleDownloadClasswork(entry)}>
                        Download PDF
                      </button>
                      <button className="button tertiary" onClick={() => handleShareClassworkWhatsApp(entry)}>
                        Share WA
                      </button>
                      <button className="button danger" onClick={() => handleDeleteClasswork(entry)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    )
  }

  if (isMarksRoute) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Teacher Intelligence</p>
            <h1>Marks / Exam Tracking</h1>
          </div>
          <div className="header-actions">
            <span className="session-email">{session.user.email}</span>
            <a href="/" className="button secondary" role="button">
              Back to app
            </a>
            <button type="button" className="button tertiary" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main>
          <section className="panel panel-form">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Marks</p>
                <h2>Add exam marks</h2>
              </div>
            </div>

            <form className="student-form" onSubmit={handleSaveMarks}>
              <div className="field-grid">
                <div className="field-group">
                  <label htmlFor="marksClassFilterInput">Class</label>
                  <select
                    id="marksClassFilterInput"
                    value={marksForm.classFilter}
                    onChange={(e) => handleMarksFieldChange('classFilter', e.target.value)}
                  >
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className === 'all' ? 'All classes' : className}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="marksStudentId">Student</label>
                  <select
                    id="marksStudentId"
                    value={marksForm.studentId}
                    onChange={(e) => handleMarksFieldChange('studentId', e.target.value)}
                  >
                    <option value="">Select student</option>
                    {marksFormStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.className})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="marksSubject">Subject</label>
                  <input
                    id="marksSubject"
                    value={marksForm.subject}
                    onChange={(e) => handleMarksFieldChange('subject', e.target.value)}
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="marksExamType">Exam Type</label>
                  <select
                    id="marksExamType"
                    value={marksForm.examType}
                    onChange={(e) => handleMarksFieldChange('examType', e.target.value)}
                  >
                    <option value="Unit Test">Unit Test</option>
                    <option value="Mid Term">Mid Term</option>
                    <option value="Final Exam">Final Exam</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="marksScore">Score</label>
                  <input
                    id="marksScore"
                    type="number"
                    min="0"
                    value={marksForm.score}
                    onChange={(e) => handleMarksFieldChange('score', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="marksTotalMarks">Total Marks</label>
                  <input
                    id="marksTotalMarks"
                    type="number"
                    min="1"
                    value={marksForm.totalMarks}
                    onChange={(e) => handleMarksFieldChange('totalMarks', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="marksExamDate">Exam Date</label>
                  <input
                    id="marksExamDate"
                    type="date"
                    value={marksForm.examDate}
                    onChange={(e) => handleMarksFieldChange('examDate', e.target.value)}
                  />
                </div>
              </div>

              {marksError && <div className="alert error">{marksError}</div>}
              {marksNotice && <div className="alert notice">{marksNotice}</div>}

              <div className="form-actions">
                <button type="submit" className="button primary" disabled={marksSaving}>
                  {marksSaving ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel panel-table">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Exam history</p>
                <h2>Marks records</h2>
              </div>
              <div className="filter-row">
                <select value={marksClassFilter} onChange={(e) => setMarksClassFilter(e.target.value)}>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className === 'all' ? 'All classes' : className}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {marksLoading && <p className="empty-state">Loading marks...</p>}

            {!marksLoading && filteredMarksEntries.length === 0 && (
              <p className="empty-state">No marks recorded yet. Add one above.</p>
            )}

            {!marksLoading && filteredMarksEntries.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Exam Type</th>
                      <th>Score</th>
                      <th>Percent</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMarksEntries.map((entry) => {
                      const percent = marksPercent(entry.score, entry.total_marks)
                      return (
                        <tr key={entry.id}>
                          <td data-label="Student">{entry.student?.name || 'Unknown'}</td>
                          <td data-label="Class">{entry.student?.className || '—'}</td>
                          <td data-label="Subject">{entry.subject}</td>
                          <td data-label="Exam Type">{entry.exam_type}</td>
                          <td data-label="Score">
                            {entry.score} / {entry.total_marks}
                          </td>
                          <td data-label="Percent">
                            <span className={`marks-badge ${marksTier(percent)}`}>{percent}%</span>
                          </td>
                          <td data-label="Date">{entry.exam_date}</td>
                          <td className="table-actions" data-label="Actions">
                            <button className="button danger" onClick={() => handleDeleteMark(entry)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    )
  }

  if (isNotesRoute) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Teacher Intelligence</p>
            <h1>Notes</h1>
          </div>
          <div className="header-actions">
            <span className="session-email">{session.user.email}</span>
            <a href="/" className="button secondary" role="button">
              Back to app
            </a>
            <button type="button" className="button tertiary" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main>
          <section className="panel panel-form">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Notes</p>
                <h2>Add teacher note</h2>
              </div>
            </div>

            <form className="student-form" onSubmit={handleSaveNote}>
              <div className="field-grid">
                <div className="field-group">
                  <label htmlFor="notesClassFilterInput">Class</label>
                  <select
                    id="notesClassFilterInput"
                    value={notesForm.classFilter}
                    onChange={(e) => handleNotesFieldChange('classFilter', e.target.value)}
                  >
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className === 'all' ? 'All classes' : className}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="notesStudentId">Student</label>
                  <select
                    id="notesStudentId"
                    value={notesForm.studentId}
                    onChange={(e) => handleNotesFieldChange('studentId', e.target.value)}
                  >
                    <option value="">Select student</option>
                    {notesFormStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.className})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="notesDate">Date</label>
                  <input
                    id="notesDate"
                    type="date"
                    value={notesForm.noteDate}
                    onChange={(e) => handleNotesFieldChange('noteDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="notesText">Note</label>
                <textarea
                  id="notesText"
                  rows={3}
                  value={notesForm.noteText}
                  onChange={(e) => handleNotesFieldChange('noteText', e.target.value)}
                  placeholder="Observations, remarks, or reminders about this student"
                />
              </div>

              {notesError && <div className="alert error">{notesError}</div>}
              {notesNotice && <div className="alert notice">{notesNotice}</div>}

              <div className="form-actions">
                <button type="submit" className="button primary" disabled={notesSaving}>
                  {notesSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel panel-table">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Note history</p>
                <h2>Teacher notes</h2>
              </div>
              <div className="filter-row">
                <select value={notesClassFilter} onChange={(e) => setNotesClassFilter(e.target.value)}>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className === 'all' ? 'All classes' : className}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {notesLoading && <p className="empty-state">Loading notes...</p>}

            {!notesLoading && filteredNotesEntries.length === 0 && (
              <p className="empty-state">No notes recorded yet. Add one above.</p>
            )}

            {!notesLoading && filteredNotesEntries.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Note</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotesEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td data-label="Student">{entry.student?.name || 'Unknown'}</td>
                        <td data-label="Class">{entry.student?.className || '—'}</td>
                        <td data-label="Note">{entry.note_text}</td>
                        <td data-label="Date">{entry.note_date}</td>
                        <td className="table-actions" data-label="Actions">
                          <button className="button danger" onClick={() => handleDeleteNote(entry)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    )
  }

  if (isBehaviorRoute) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Teacher Intelligence</p>
            <h1>Behavior Assessment</h1>
          </div>
          <div className="header-actions">
            <span className="session-email">{session.user.email}</span>
            <a href="/" className="button secondary" role="button">
              Back to app
            </a>
            <button type="button" className="button tertiary" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main>
          <section className="panel panel-form">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Behavior</p>
                <h2>Add behavior assessment</h2>
              </div>
            </div>

            <form className="student-form" onSubmit={handleSaveBehavior}>
              <div className="field-grid">
                <div className="field-group">
                  <label htmlFor="behaviorClassFilterInput">Class</label>
                  <select
                    id="behaviorClassFilterInput"
                    value={behaviorForm.classFilter}
                    onChange={(e) => handleBehaviorFieldChange('classFilter', e.target.value)}
                  >
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className === 'all' ? 'All classes' : className}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="behaviorStudentId">Student</label>
                  <select
                    id="behaviorStudentId"
                    value={behaviorForm.studentId}
                    onChange={(e) => handleBehaviorFieldChange('studentId', e.target.value)}
                  >
                    <option value="">Select student</option>
                    {behaviorFormStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.className})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="behaviorDiscipline">Discipline (1-5)</label>
                  <input
                    id="behaviorDiscipline"
                    type="number"
                    min="1"
                    max="5"
                    value={behaviorForm.discipline}
                    onChange={(e) => handleBehaviorFieldChange('discipline', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="behaviorConfidence">Confidence (1-5)</label>
                  <input
                    id="behaviorConfidence"
                    type="number"
                    min="1"
                    max="5"
                    value={behaviorForm.confidence}
                    onChange={(e) => handleBehaviorFieldChange('confidence', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="behaviorCommunication">Communication (1-5)</label>
                  <input
                    id="behaviorCommunication"
                    type="number"
                    min="1"
                    max="5"
                    value={behaviorForm.communication}
                    onChange={(e) => handleBehaviorFieldChange('communication', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="behaviorLeadership">Leadership (1-5)</label>
                  <input
                    id="behaviorLeadership"
                    type="number"
                    min="1"
                    max="5"
                    value={behaviorForm.leadership}
                    onChange={(e) => handleBehaviorFieldChange('leadership', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="behaviorDate">Date</label>
                  <input
                    id="behaviorDate"
                    type="date"
                    value={behaviorForm.assessmentDate}
                    onChange={(e) => handleBehaviorFieldChange('assessmentDate', e.target.value)}
                  />
                </div>
              </div>

              {behaviorError && <div className="alert error">{behaviorError}</div>}
              {behaviorNotice && <div className="alert notice">{behaviorNotice}</div>}

              <div className="form-actions">
                <button type="submit" className="button primary" disabled={behaviorSaving}>
                  {behaviorSaving ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel panel-table">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Assessment history</p>
                <h2>Behavior records</h2>
              </div>
              <div className="filter-row">
                <select value={behaviorClassFilter} onChange={(e) => setBehaviorClassFilter(e.target.value)}>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className === 'all' ? 'All classes' : className}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {behaviorLoading && <p className="empty-state">Loading behavior assessments...</p>}

            {!behaviorLoading && filteredBehaviorEntries.length === 0 && (
              <p className="empty-state">No behavior assessments recorded yet. Add one above.</p>
            )}

            {!behaviorLoading && filteredBehaviorEntries.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Discipline</th>
                      <th>Confidence</th>
                      <th>Communication</th>
                      <th>Leadership</th>
                      <th>Average</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBehaviorEntries.map((entry) => {
                      const average =
                        (Number(entry.discipline) +
                          Number(entry.confidence) +
                          Number(entry.communication) +
                          Number(entry.leadership)) /
                        4
                      const percent = Math.round((average / 5) * 100)
                      return (
                        <tr key={entry.id}>
                          <td data-label="Student">{entry.student?.name || 'Unknown'}</td>
                          <td data-label="Class">{entry.student?.className || '—'}</td>
                          <td data-label="Discipline">{entry.discipline}/5</td>
                          <td data-label="Confidence">{entry.confidence}/5</td>
                          <td data-label="Communication">{entry.communication}/5</td>
                          <td data-label="Leadership">{entry.leadership}/5</td>
                          <td data-label="Average">
                            <span className={`marks-badge ${marksTier(percent)}`}>{average.toFixed(1)}/5</span>
                          </td>
                          <td data-label="Date">{entry.assessment_date}</td>
                          <td className="table-actions" data-label="Actions">
                            <button className="button danger" onClick={() => handleDeleteBehavior(entry)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Teacher Intelligence</p>
          <h1>Student management portal</h1>
        </div>
        <div className="header-actions">
          <span className="session-email">{session.user.email}</span>
          <a href="/classwork" className="button tertiary" role="button">
            Classwork
          </a>
          <a href="/marks" className="button tertiary" role="button">
            Marks
          </a>
          <a href="/notes" className="button tertiary" role="button">
            Notes
          </a>
          <a href="/behavior" className="button tertiary" role="button">
            Behavior
          </a>
          {userRole === 'admin' && (
            <a href="/admin" className="button tertiary" role="button">
              Admin Setup
            </a>
          )}
          <button type="button" className="button secondary" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main>
        {isStudentsTableMissing && (
          <section className="panel setup-panel">
            <p className="eyebrow">Database setup</p>
            <h2>Missing students table</h2>
            <p className="intro">
              Auth is now working. Next step: create the students table in Supabase SQL Editor, then refresh this page.
            </p>
          </section>
        )}

        <section className="panel panel-form">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Student record</p>
              <h2>{form.id ? 'Edit student' : 'Add new student'}</h2>
            </div>
            <div>{loading ? 'Loading...' : `${students.length} student(s)`}</div>
          </div>

          {error && <div className="alert error">{error}</div>}

          <form onSubmit={handleSubmit} className="student-form">
            <div className="field-group">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Student name"
              />
            </div>

            <div className="field-grid">
              <div className="field-group">
                <label>Roll Number</label>
                <input
                  value={form.rollNo}
                  onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                  placeholder="Roll no"
                />
              </div>
              <div className="field-group">
                <label>Class</label>
                <input
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value })}
                  placeholder="e.g. 8A"
                />
              </div>
            </div>

            <div className="field-grid">
              <div className="field-group">
                <label>Father Name</label>
                <input
                  value={form.fatherName}
                  onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                  placeholder="Father name"
                />
              </div>
              <div className="field-group">
                <label>Mother Name</label>
                <input
                  value={form.motherName}
                  onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                  placeholder="Mother name"
                />
              </div>
            </div>

            <div className="field-grid">
              <div className="field-group">
                <label>Phone</label>
                <input
                  value={form.parentPhone}
                  onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                  placeholder="Parent phone"
                />
              </div>
              <div className="field-group">
                <label>Admission No</label>
                <input
                  value={form.admissionNo}
                  onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                  placeholder="Admission number"
                />
              </div>
            </div>

            <div className="field-grid">
              <div className="field-group">
                <label>DOB</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </div>
              <div className="field-group">
                <label>Blood Group</label>
                <input
                  value={form.bloodGroup}
                  onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                  placeholder="Blood group"
                />
              </div>
            </div>

            <div className="field-grid">
              <div className="field-group">
                <label>Aadhar</label>
                <input
                  value={form.aadharNumber}
                  onChange={(e) => setForm({ ...form, aadharNumber: e.target.value })}
                  placeholder="Aadhar number"
                />
              </div>
              <div className="field-group">
                <label>Saral Portal</label>
                <input
                  value={form.saralPortalNumber}
                  onChange={(e) => setForm({ ...form, saralPortalNumber: e.target.value })}
                  placeholder="Saral portal id"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="button primary">
                {form.id ? 'Update Student' : 'Save Student'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setForm(initialStudentForm)}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="panel panel-table">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Student roster</p>
              <h2>Student records</h2>
            </div>
            <div className="filter-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, roll, class"
              />
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                {classes.map((className) => (
                  <option key={className} value={className}>
                    {className === 'all' ? 'All classes' : className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll</th>
                  <th>Class</th>
                  <th>Parent</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td data-label="Name">{student.name}</td>
                    <td data-label="Roll">{student.rollNo}</td>
                    <td data-label="Class">{student.className}</td>
                    <td data-label="Parent">{student.fatherName || student.motherName || '—'}</td>
                    <td data-label="Phone">{student.parentPhone || '—'}</td>
                    <td className="table-actions" data-label="Actions">
                      <button className="button tertiary" onClick={() => handleEdit(student)}>
                        Edit
                      </button>
                      <button className="button danger" onClick={() => handleDelete(student.id)}>
                        Delete
                      </button>
                      <button className="button tertiary" onClick={() => handleDownloadStudentReport(student)}>
                        Report
                      </button>
                      <button className="button tertiary" onClick={() => handleShareStudentWhatsApp(student)}>
                        Share WA
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No students found. Adjust your filters or add a student.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel panel-table">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Daily attendance</p>
              <h2>Attendance</h2>
            </div>
            <div className="filter-row">
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
              <select
                value={attendanceClassFilter}
                onChange={(e) => {
                  setAttendanceClassFilter(e.target.value)
                  setAttendanceNotice('')
                }}
              >
                {classes.map((className) => (
                  <option key={className} value={className}>
                    {className === 'all' ? 'All classes' : className}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button primary"
                onClick={handleSaveAttendance}
                disabled={attendanceSaving || attendanceLoading}
              >
                {attendanceSaving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          {attendanceError && <div className="alert error">{attendanceError}</div>}
          {attendanceNotice && <div className="alert notice">{attendanceNotice}</div>}

          {attendanceLoading && <p className="empty-state">Loading attendance...</p>}

          {!attendanceLoading && attendanceStudents.length === 0 && (
            <p className="empty-state">No students found. Adjust the class filter or add a student.</p>
          )}

          {!attendanceLoading && currentAttendanceStudent && (
            <div className="attendance-card">
              <p className="attendance-card-name">{currentAttendanceStudent.name}</p>
              <p className="attendance-card-meta">
                Roll No: <strong>{currentAttendanceStudent.rollNo}</strong> &nbsp; Class:{' '}
                <strong>{currentAttendanceStudent.className}</strong>
              </p>

              <div className="attendance-status-group">
                {['Present', 'Absent', 'Late'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`status-button${attendanceDraft[currentAttendanceStudent.id] === status ? ' active' : ''}`}
                    onClick={() => handleAttendanceStatusChange(currentAttendanceStudent.id, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="attendance-pagination">
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setAttendanceIndex(0)}
                  disabled={attendanceIndex === 0}
                  aria-label="First student"
                >
                  «
                </button>
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setAttendanceIndex((i) => Math.max(0, i - 1))}
                  disabled={attendanceIndex === 0}
                  aria-label="Previous student"
                >
                  ‹
                </button>
                <span className="pagination-status">
                  Student {attendanceIndex + 1} of {attendanceStudents.length}
                </span>
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setAttendanceIndex((i) => Math.min(attendanceStudents.length - 1, i + 1))}
                  disabled={attendanceIndex >= attendanceStudents.length - 1}
                  aria-label="Next student"
                >
                  ›
                </button>
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setAttendanceIndex(attendanceStudents.length - 1)}
                  disabled={attendanceIndex >= attendanceStudents.length - 1}
                  aria-label="Last student"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel panel-table">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Reports & exports</p>
              <h2>Reports & Exports</h2>
            </div>
            <div className="filter-row">
              <select value={reportClassFilter} onChange={(e) => setReportClassFilter(e.target.value)}>
                {classes.map((className) => (
                  <option key={className} value={className}>
                    {className === 'all' ? 'All classes' : className}
                  </option>
                ))}
              </select>
              <button type="button" className="button primary" onClick={handleDownloadClassPdf}>
                Download PDF
              </button>
              <button type="button" className="button primary" onClick={handleDownloadClassExcel}>
                Export Excel
              </button>
              <button type="button" className="button tertiary" onClick={handleBackupJson}>
                Backup JSON
              </button>
            </div>
          </div>

          {reportsError && <div className="alert error">{reportsError}</div>}
          <p className="empty-state">
            Reports include student details and attendance summary. Marks, homework, behavior, and notes will appear
            once those modules are added.
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
