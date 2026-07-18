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
  updateOwnPassword
} from './supabaseClient'
import './App.css'

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

function App() {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname === '/admin'
  const isAdminLoginRoute = typeof window !== 'undefined' && window.location.pathname === '/adminlogin'
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
        await updateStudent(form.id, {
          ...form,
          updatedAt: new Date().toISOString()
        })
      } else {
        await addStudent({
          ...form,
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

  const classes = useMemo(() => {
    const set = new Set(students.map((student) => student.className).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [students])

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Teacher Intelligence</p>
          <h1>Student management with Supabase</h1>
          <p className="intro">A modern React dashboard with database-backed student records.</p>
        </div>
        <div className="header-actions">
          <span className="session-email">{session.user.email}</span>
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
                    <td>{student.name}</td>
                    <td>{student.rollNo}</td>
                    <td>{student.className}</td>
                    <td>{student.fatherName || student.motherName || '—'}</td>
                    <td>{student.parentPhone || '—'}</td>
                    <td className="table-actions">
                      <button className="button tertiary" onClick={() => handleEdit(student)}>
                        Edit
                      </button>
                      <button className="button danger" onClick={() => handleDelete(student.id)}>
                        Delete
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
      </main>
    </div>
  )
}

export default App
