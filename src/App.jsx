import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const emptyAssignment = {
  title: '',
  instructions: '',
  dueAt: '',
}

function getStatus(dueAt) {
  return new Date(dueAt).getTime() < Date.now() ? 'Overdue' : 'Open'
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [filter, setFilter] = useState('all')
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [assignment, setAssignment] = useState(emptyAssignment)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setAssignments([])
      return
    }

    loadDashboard(session.user.id)
  }, [session])

  async function loadDashboard(userId) {
    setBusy(true)

    const [profileResult, assignmentsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, role')
        .eq('id', userId)
        .single(),
      supabase
        .from('assignments')
        .select('id, title, instructions, due_at, created_by, created_at')
        .order('due_at', { ascending: true }),
    ])

    if (profileResult.error || assignmentsResult.error) {
      setMessage(
        profileResult.error?.message || assignmentsResult.error?.message,
      )
    } else {
      setProfile(profileResult.data)
      setAssignments(assignmentsResult.data)
    }

    setBusy(false)
  }

  async function handleAuth(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })

      if (error) {
        setMessage(error.message)
      } else if (!data.session) {
        setMessage('Account created. Confirm the email before signing in.')
      } else {
        setMessage('Account created and signed in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setMessage(error ? error.message : 'Signed in successfully.')
    }

    setBusy(false)
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    setMessage(error ? error.message : 'Signed out.')
  }

  async function handleCreateAssignment(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    const { error } = await supabase.from('assignments').insert({
      id: `${session.user.id}-${Date.now()}`,
      title: assignment.title,
      instructions: assignment.instructions,
      due_at: new Date(assignment.dueAt).toISOString(),
      created_by: session.user.id,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setAssignment(emptyAssignment)
      setMessage('Assignment published.')
      await loadDashboard(session.user.id)
    }

    setBusy(false)
  }

  async function runPermissionCheck() {
    setBusy(true)
    setMessage('')

    const { error } = await supabase.from('assignments').insert({
      id: `${session.user.id}-probe-${Date.now()}`,
      title: 'Student permission probe',
      instructions: 'This row should be rejected after RLS is fixed.',
      due_at: new Date(Date.now() + 86400000).toISOString(),
      created_by: session.user.id,
    })

    if (error) {
      setMessage(`Blocked by database policy: ${error.message}`)
    } else {
      setMessage(
        'The insert succeeded. The UI is hiding controls, but the database is still too permissive.',
      )
      await loadDashboard(session.user.id)
    }

    setBusy(false)
  }

  const visibleAssignments = assignments.filter((item) => {
    if (filter === 'all') return true
    return getStatus(item.due_at).toLowerCase() === filter
  })

  if (session === undefined) {
    return <main className="centered">Loading RoleGate...</main>
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">RoleGate Assignments</p>
          <h1>{authMode === 'signup' ? 'Create a test account' : 'Welcome back'}</h1>
          <p className="muted">
            Every new account starts as a student. Promote only the facilitator
            from the SQL Editor.
          </p>

          <form onSubmit={handleAuth} className="stack">
            {authMode === 'signup' && (
              <label>
                Display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button disabled={busy} type="submit">
              {busy
                ? 'Working...'
                : authMode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <button
            className="link-button"
            onClick={() => {
              setAuthMode(authMode === 'signup' ? 'signin' : 'signup')
              setMessage('')
            }}
          >
            {authMode === 'signup'
              ? 'Already registered? Sign in'
              : 'Need a test account? Register'}
          </button>

          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    )
  }

  if (!profile) {
    return <main className="centered">Loading your role...</main>
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RoleGate Assignments</p>
          <h1>{profile.display_name}'s dashboard</h1>
        </div>
        <div className="account-actions">
          <span className={`role-pill ${profile.role}`}>{profile.role}</span>
          <button className="secondary" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {message && <p className="notice">{message}</p>}

      <section className="dashboard-grid">
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Shared workspace</p>
              <h2>Assignments</h2>
            </div>
            <span>{visibleAssignments.length} total</span>
          </div>

          <div className="filters" aria-label="Assignment status filters">
            {['all', 'open', 'overdue'].map((option) => (
              <button
                className={`filter-button ${filter === option ? 'active' : ''}`}
                key={option}
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="assignment-grid">
            {visibleAssignments.map((item) => {
              const status = getStatus(item.due_at)
              return (
                <article className="assignment-card" key={item.id}>
                  <div className="card-heading">
                    <h3>{item.title}</h3>
                    <span className={`status ${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </div>
                  <p>{item.instructions}</p>
                  <p className="due-date">Due {formatDate(item.due_at)}</p>
                </article>
              )
            })}
            {!visibleAssignments.length && (
              <p className="empty-state">No assignments match this filter.</p>
            )}
          </div>
        </div>

        <aside>
          {profile.role === 'facilitator' ? (
            <section className="panel">
              <p className="eyebrow">Facilitator action</p>
              <h2>Create Assignment</h2>
              <form onSubmit={handleCreateAssignment} className="stack">
                <label>
                  Title
                  <input
                    value={assignment.title}
                    onChange={(event) =>
                      setAssignment({ ...assignment, title: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  Instructions
                  <textarea
                    value={assignment.instructions}
                    onChange={(event) =>
                      setAssignment({
                        ...assignment,
                        instructions: event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Due date
                  <input
                    type="datetime-local"
                    value={assignment.dueAt}
                    onChange={(event) =>
                      setAssignment({ ...assignment, dueAt: event.target.value })
                    }
                    required
                  />
                </label>

                <button disabled={busy} type="submit">
                  Publish assignment
                </button>
              </form>
            </section>
          ) : (
            <section className="panel">
              <p className="eyebrow">Student security check</p>
              <h2>Verify your permissions</h2>
              <p className="muted">
                This sends an assignment insert directly to Supabase. The final
                policy must reject it even though the browser has a publishable key.
              </p>
              <button disabled={busy} onClick={runPermissionCheck}>
                Run permission check
              </button>
            </section>
          )}
        </aside>
      </section>
    </main>
  )
}