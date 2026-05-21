import { useEffect, useRef, useState } from 'react'
import { Navbar, Button, useTheme, useMotion } from '@aplo/ui'
import { ChevronDown, LogOut, Moon, Sun } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useStore } from './store'
import type { NavView } from './types'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectPage } from './pages/ProjectPage'
import { ReportEditorPage } from './pages/ReportEditorPage'
import { AuthPage } from './pages/AuthPage'

const ALLOWED_DOMAIN = 'aplodigital.com.au'

// ─── Nav: user dropdown ───────────────────────────────────────────────────────

function NavUserMenu({ session }: { session: Session }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const fullName: string =
    session.user.user_metadata?.full_name ||
    session.user.email?.split('@')[0] ||
    'User'
  const firstName = fullName.split(' ')[0]
  const email = session.user.email ?? ''

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
      >
        Logged in as{' '}
        <span className="font-medium text-foreground">{firstName}</span>
        <ChevronDown className="w-3 h-3 ml-0.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            {fullName && (
              <p className="text-xs font-semibold text-foreground">{fullName}</p>
            )}
            <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); void supabase.auth.signOut() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Nav: theme switch + user menu ───────────────────────────────────────────

function NavControls({ session }: { session: Session }) {
  const { theme, setTheme } = useTheme()
  const { setMotionEnabled } = useMotion()

  useEffect(() => {
    setMotionEnabled(false)
  }, [])

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
      <NavUserMenu session={session} />
    </div>
  )
}

// ─── Main app ─────────────────────────────────────────────────────────────────

// Supabase puts `type=recovery` in the URL hash after redirecting from the email link.
// We read it synchronously so we never miss the recovery intent even if the
// PASSWORD_RECOVERY event fires before the component subscribes to onAuthStateChange.
function isRecoveryRedirect() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const recovery = params.get('type') === 'recovery'
  if (recovery) history.replaceState(null, '', window.location.pathname)
  return recovery
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(isRecoveryRedirect)
  const [view, setView] = useState<NavView>({ name: 'projects' })
  const store = useStore()
  const navigate = (v: NavView) => setView(v)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      } else if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        // Clear recovery mode once password is saved or user signs out
        setPasswordRecovery(false)
      }
      setSession(session)
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const project =
    view.name !== 'projects'
      ? store.projects.find((p) => p.id === (view as { projectId: string }).projectId)
      : null

  const report =
    view.name === 'report'
      ? project?.reports.find((r) => r.id === (view as { reportId: string }).reportId)
      : null

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <AuthPage unauthorizedEmail={unauthorizedEmail} />
  }

  if (passwordRecovery) {
    return <AuthPage mode="reset" />
  }

  // Domain guard — sign out and show error if not an Aplo email
  const email = session.user.email ?? ''
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    supabase.auth.signOut()
    if (!unauthorizedEmail) setUnauthorizedEmail(email)
    return <AuthPage unauthorizedEmail={email} />
  }

  return (
    <div className="flex flex-col h-dvh">
      <Navbar
        left={<span className="font-semibold text-sm">Project Timeline</span>}
        right={<NavControls session={session} />}
      />

      {/* Breadcrumb — only inside a project/report */}
      {view.name !== 'projects' && (
        <div className="flex items-center gap-1 border-b border-border bg-background px-3 py-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'projects' })}>
            Projects
          </Button>
          {project && (
            <>
              <span className="text-muted-foreground text-sm">/</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ name: 'project', projectId: project.id })}
              >
                {project.name}
              </Button>
            </>
          )}
          {report && view.name === 'report' && (
            <>
              <span className="text-muted-foreground text-sm">/</span>
              <span className="text-sm px-2 py-1 text-muted-foreground">
                Week {report.weekNumber}
              </span>
            </>
          )}
        </div>
      )}

      {/* Page content */}
      {store.isLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      )}
      {!store.isLoading && view.name === 'projects' && (
        <div className="flex-1 min-h-0 overflow-auto">
          <ProjectsPage store={store} navigate={navigate} />
        </div>
      )}
      {!store.isLoading && view.name === 'project' && (
        <div className="flex-1 min-h-0 overflow-auto">
          <ProjectPage store={store} navigate={navigate} projectId={view.projectId} />
        </div>
      )}
      {!store.isLoading && view.name === 'report' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ReportEditorPage
            store={store}
            navigate={navigate}
            projectId={view.projectId}
            reportId={view.reportId}
          />
        </div>
      )}
    </div>
  )
}

export default App
