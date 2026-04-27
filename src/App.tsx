import { useEffect, useState } from 'react'
import { Navbar, Button, Switch, useTheme, useMotion } from '@aplo/ui'
import { useStore } from './store'
import type { NavView } from './types'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectPage } from './pages/ProjectPage'
import { ReportEditorPage } from './pages/ReportEditorPage'

function NavControls() {
  const { theme, setTheme } = useTheme()
  const { setMotionEnabled } = useMotion()

  useEffect(() => {
    setMotionEnabled(false)
  }, [])

  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 text-sm">
        Light
        <Switch
          checked={theme === 'light'}
          onCheckedChange={(c) => setTheme(c ? 'light' : 'dark')}
          size="sm"
        />
      </label>
    </div>
  )
}

function App() {
  const [view, setView] = useState<NavView>({ name: 'projects' })
  const store = useStore()
  const navigate = (v: NavView) => setView(v)

  const project =
    view.name !== 'projects'
      ? store.projects.find((p) => p.id === (view as { projectId: string }).projectId)
      : null

  const report =
    view.name === 'report'
      ? project?.reports.find((r) => r.id === (view as { reportId: string }).reportId)
      : null

  return (
    <div className="flex flex-col h-dvh">
      <Navbar
        left={<span className="font-semibold text-sm">Project Timeline</span>}
        right={<NavControls />}
      />

      {/* Secondary navbar — breadcrumb, only shown when inside a project/report */}
      {view.name !== 'projects' && (
        <div className="flex items-center gap-1 border-b border-border bg-background px-3 py-2 shrink-0 ">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ name: 'projects' })}
          >
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
              <span className="text-sm px-2 py-1 text-muted-foreground">Week {report.weekNumber}</span>
            </>
          )}
        </div>
      )}

      {/* Page content — scrollable for list pages, fixed for editor */}
      {view.name === 'projects' && (
        <div className="flex-1 min-h-0 overflow-auto">
          <ProjectsPage store={store} navigate={navigate} />
        </div>
      )}
      {view.name === 'project' && (
        <div className="flex-1 min-h-0 overflow-auto">
          <ProjectPage store={store} navigate={navigate} projectId={view.projectId} />
        </div>
      )}
      {view.name === 'report' && (
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
