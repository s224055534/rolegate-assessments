// Keep the mock records close to the interface while the database is not connected.
const assignments = [
  { id: 'mock-open', title: 'Plan the project launch', instructions: 'Write a short checklist for the launch meeting.', due_at: '2099-01-15T16:00:00Z' },
  { id: 'mock-overdue', title: 'Review access rules', instructions: 'Check which actions belong to each portal role.', due_at: '2020-01-15T16:00:00Z' },
]

// Derive the badge from the stored due date whenever the dashboard renders.
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
  // Render the same card structure for every assignment record.
  return (
    <main className="app-shell">
      <header className="topbar"><div><p className="eyebrow">Shared workspace</p><h1>RoleGate Assignments</h1></div><span className="role-pill student">student preview</span></header>
      <section className="dashboard-grid">
        <div><div className="section-heading"><div><p className="eyebrow">Assignment dashboard</p><h2>Assignments</h2></div><span>{assignments.length} total</span></div>
          <div className="assignment-grid">{assignments.map((item) => { const status = getStatus(item.due_at); return <article className="assignment-card" key={item.id}><div className="card-heading"><h3>{item.title}</h3><span className={`status ${status.toLowerCase()}`}>{status}</span></div><p>{item.instructions}</p><p className="due-date">Due {formatDate(item.due_at)}</p></article> })}</div>
        </div>
        <aside><section className="panel"><p className="eyebrow">Role preview</p><h2>Student dashboard</h2><p className="muted">Students can read every published assignment from this shared workspace.</p></section></aside>
      </section>
    </main>
  )
}