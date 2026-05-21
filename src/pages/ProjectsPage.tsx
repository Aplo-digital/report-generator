import { useState, useRef, useEffect } from 'react'
import { Button, Container, Input, PageHeader, Select, SelectItem } from '@aplo/ui'
import { Plus, Calendar, FileText, Trash2, X, Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { InputGroup } from '../components/InputGroup'
import type { NavView, Project, MilestoneDef, SprintLength } from '../types'
import type { Store } from '../store'
import { uid, todayISO, addDaysISO, formatDisplayDate } from '../utils'
import { fetchFloatProjects, fetchFloatClients } from '../float'
import type { FloatProject, FloatClient } from '../float'

interface Props {
  store: Store
  navigate: (v: NavView) => void
}

function createProject(): Project {
  const today = todayISO()
  return {
    id: uid(),
    name: '',
    description: '',
    goal: '',
    clientName: '',
    clientLogo: null,
    startDate: today,
    endDate: addDaysISO(today, 42),
    sprintLength: 1,
    milestones: [],
    currentMilestoneProgress: {},
    timelineWindowStart: 0,
    reports: [],
    floatProjectId: null,
  }
}

// ─── Float prefill ────────────────────────────────────────────────────────────

type FloatPickerState = 'idle' | 'loading' | 'picking' | 'done' | 'error'

function FloatPrefillSection({ onChange }: { onChange: (patch: Partial<Project>) => void }) {
  const [state, setState] = useState<FloatPickerState>('idle')
  const [projects, setProjects] = useState<FloatProject[]>([])
  const [clientMap, setClientMap] = useState<Map<number, string>>(new Map())
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const load = async () => {
    setState('loading')
    setSearch('')
    setError(null)
    try {
      const [floatProjects, floatClients] = await Promise.all([
        fetchFloatProjects(),
        fetchFloatClients(),
      ])
      setProjects(floatProjects.filter((p) => p.active !== 0))
      setClientMap(new Map((floatClients as FloatClient[]).map((c) => [c.client_id, c.name])))
      setState('picking')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Float projects')
      setState('error')
    }
  }

  const handleSelect = (project: FloatProject) => {
    const clientName = project.client_id != null ? (clientMap.get(project.client_id) ?? '') : ''
    const today = todayISO()
    onChange({
      name: project.name,
      clientName,
      description: project.description ?? '',
      startDate: project.start_date ?? today,
      endDate: project.end_date ?? addDaysISO(today, 42),
      floatProjectId: project.project_id,
    })
    setSelected(project.name)
    setState('done')
  }

  const dismiss = () => setState(selected ? 'done' : 'idle')

  // Close dropdown on click-outside
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) dismiss()
  }

  useEffect(() => {
    if (state === 'picking') inputRef.current?.focus()
  }, [state])

  const filtered = projects.filter((p) => {
    const clientName = p.client_id != null ? (clientMap.get(p.client_id) ?? '') : ''
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || clientName.toLowerCase().includes(q)
  })

  // ── Card — fixed height in every state, dropdown floats below ──
  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      {/* Card */}
      <div
        className={[
          'rounded-lg border p-4 flex items-center justify-between gap-4 transition-colors',
          state === 'picking' ? 'border-primary/40 bg-background' :
          state === 'done'    ? 'border-primary/20 bg-primary/5' :
          state === 'error'   ? 'border-destructive/30 bg-destructive/5' :
                                'border-dashed border-border',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {state === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-muted-foreground" />
          ) : state === 'done' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
          ) : state === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
          ) : (
            <Database className="w-4 h-4 shrink-0 text-muted-foreground" />
          )}

          <div className="flex-1 min-w-0">
            {state === 'picking' ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && dismiss()}
                  placeholder="Search Float projects…"
                  className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
                />
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filtered.length} project{filtered.length !== 1 ? 's' : ''} found
                </p>
              </>
            ) : state === 'done' ? (
              <>
                <p className="text-sm font-medium">Pre-filled from Float</p>
                <p className="text-xs text-muted-foreground truncate">{selected}</p>
              </>
            ) : state === 'error' ? (
              <>
                <p className="text-sm font-medium text-destructive">Could not load Float projects</p>
                <p className="text-xs text-muted-foreground truncate">{error}</p>
              </>
            ) : state === 'loading' ? (
              <>
                <p className="text-sm font-medium">Loading Float projects…</p>
                <p className="text-xs text-muted-foreground">Connecting to Float</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Pre-fill from Float</p>
                <p className="text-xs text-muted-foreground">Import project details automatically</p>
              </>
            )}
          </div>
        </div>

        {/* Right action */}
        {state === 'idle' && (
          <Button variant="outline" size="sm" onClick={load}>Select Float project</Button>
        )}
        {state === 'done' && (
          <Button variant="ghost" size="sm" onClick={load}>Change</Button>
        )}
        {state === 'error' && (
          <Button variant="ghost" size="sm" onClick={() => setState('idle')}>Dismiss</Button>
        )}
        {state === 'picking' && (
          <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Floating dropdown — absolutely positioned, no layout shift */}
      {state === 'picking' && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-white shadow-xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto divide-y divide-border/50">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No projects match "{search}"</p>
            ) : (
              filtered.map((p) => {
                const client = p.client_id != null ? clientMap.get(p.client_id) : null
                return (
                  <button
                    key={p.project_id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(p)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    {client && <span className="text-xs text-muted-foreground ml-4 shrink-0">{client}</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function createDummyProject(): Project {
  const startDate = todayISO()
  const totalWeeks = 12
  const milestoneCount = 9
  const milestoneNames = [
    'Discovery kickoff',
    'Stakeholder alignment',
    'Requirements baseline',
    'User research synthesis',
    'Journey mapping',
    'Initial concepts',
    'Design review',
    'Prototype build',
    'Project closeout',
  ]

  const milestones: MilestoneDef[] = milestoneNames.map((name, index) => {
    const startWeek = Math.round((index * (totalWeeks - 2)) / (milestoneCount - 1))
    return {
      id: uid(),
      name,
      startWeek,
      endWeek: Math.min(totalWeeks - 1, startWeek + 1),
    }
  })

  return {
    id: uid(),
    name: 'Website Transformation Program',
    description: 'A sample project for testing weekly reporting, milestone visibility, and timeline behaviour.',
    goal: 'Launch a refreshed digital experience with phased delivery across discovery, design, build, and rollout.',
    clientName: 'Northwind Health',
    clientLogo: null,
    startDate,
    endDate: addDaysISO(startDate, (totalWeeks - 1) * 7),
    sprintLength: 1,
    milestones,
    currentMilestoneProgress: Object.fromEntries(milestones.map((milestone) => [milestone.id, 0])),
    timelineWindowStart: 0,
    reports: [],
  }
}

function validateProject(project: Project) {
  const errors: Partial<Record<'name' | 'clientName' | 'description' | 'goal' | 'startDate' | 'endDate', string>> = {}

  if (!project.name.trim()) errors.name = 'Project name is required.'
  if (!project.clientName.trim()) errors.clientName = 'Client name is required.'
  if (!project.description.trim()) errors.description = 'Description is required.'
  if (!project.goal.trim()) errors.goal = 'Project goal is required.'
  if (!project.startDate) errors.startDate = 'Start date is required.'
  if (!project.endDate) errors.endDate = 'End date is required.'
  if (project.startDate && project.endDate && project.endDate < project.startDate) {
    errors.endDate = 'End date must be after the start date.'
  }

  return errors
}

function ProjectSetupModal({
  draft,
  errors,
  step,
  onChange,
  onNext,
  onCreate,
  onBack,
  onCancel,
}: {
  draft: Project
  errors: Partial<Record<'name' | 'clientName' | 'description' | 'goal' | 'startDate' | 'endDate', string>>
  step: 1 | 2
  onChange: (patch: Partial<Project>) => void
  onNext: () => void
  onCreate: () => void
  onBack: () => void
  onCancel: () => void
}) {
  const updateMilestone = (id: string, patch: Partial<MilestoneDef>) =>
    onChange({ milestones: draft.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)) })

  const addMilestone = () =>
    onChange({ milestones: [...draft.milestones, { id: uid(), name: '', startWeek: 0, endWeek: 1 }] })

  const removeMilestone = (id: string) =>
    onChange({ milestones: draft.milestones.filter((m) => m.id !== id) })

  const stepTitles: Record<1 | 2, string> = {
    1: 'Capture the essentials before you save',
    2: 'Add milestones to the timeline',
  }
  const stepDescriptions: Record<1 | 2, string> = {
    1: 'This keeps every project starting with the core context your reports depend on.',
    2: 'Each milestone appears on the Gantt chart and tracks progress across reports. You can edit these any time.',
  }
  const footerHints: Record<1 | 2, string> = {
    1: '',
    2: 'Milestone progress carries forward automatically as reports are created.',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl border shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-2">
                  New Project: Step {step} of 2
                </p>
                <h2 className="text-2xl font-semibold mb-2">{stepTitles[step]}</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">{stepDescriptions[step]}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onCancel} className="shrink-0 mt-1">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-8">
              <FloatPrefillSection onChange={onChange} />
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Project Name"
                      value={draft.name}
                      onChange={(e) => onChange({ name: e.target.value })}
                      placeholder="Design System Mobilisation"
                    />
                    {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div>
                    <Input
                      label="Client Name"
                      value={draft.clientName}
                      onChange={(e) => onChange({ clientName: e.target.value })}
                      placeholder="Flinders University"
                    />
                    {errors.clientName && (
                      <p className="mt-1 text-xs text-destructive">{errors.clientName}</p>
                    )}
                  </div>
                </div>
              </section>

              <section>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Description</label>
                    <textarea
                      value={draft.description}
                      onChange={(e) => onChange({ description: e.target.value })}
                      placeholder="Brief description of the project..."
                      rows={3}
                      className="w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-sm resize-y outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsl(179_100%_21%/0.12)] placeholder:text-muted-foreground text-foreground"
                    />
                    {errors.description && (
                      <p className="mt-1 text-xs text-destructive">{errors.description}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Project Goal</label>
                    <textarea
                      value={draft.goal}
                      onChange={(e) => onChange({ goal: e.target.value })}
                      placeholder="What does success look like?"
                      rows={3}
                      className="w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-sm resize-y outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsl(179_100%_21%/0.12)] placeholder:text-muted-foreground text-foreground"
                    />
                    {errors.goal && <p className="mt-1 text-xs text-destructive">{errors.goal}</p>}
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">3. Dates &amp; Cadence</h3>
                  <p className="text-sm text-muted-foreground">
                    Set the reporting window and how long each block on the timeline represents.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Start Date"
                      type="date"
                      value={draft.startDate}
                      onChange={(e) => onChange({ startDate: e.target.value })}
                    />
                    {errors.startDate && (
                      <p className="mt-1 text-xs text-destructive">{errors.startDate}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      label="End Date"
                      type="date"
                      value={draft.endDate}
                      onChange={(e) => onChange({ endDate: e.target.value })}
                    />
                    {errors.endDate && <p className="mt-1 text-xs text-destructive">{errors.endDate}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Select
                      label="Report Interval"
                      value={String(draft.sprintLength)}
                      onValueChange={(v) => v && onChange({ sprintLength: Number(v) as SprintLength })}
                      description="How often you report progress — each block on the timeline represents this duration."
                    >
                      <SelectItem value="1">1 week</SelectItem>
                      <SelectItem value="2">2 weeks</SelectItem>
                      <SelectItem value="3">3 weeks</SelectItem>
                      <SelectItem value="4">4 weeks</SelectItem>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <InputGroup
                label="Gantt view starts at"
                leading="Week"
                type="number"
                min={0}
                value={draft.timelineWindowStart}
                onChange={(e) => onChange({ timelineWindowStart: Number(e.target.value) })}
                description="The 6-block Gantt snapshot on each report starts from this week number."
              />
              <div className="space-y-2">
                {draft.milestones.map((ms) => (
                  <div key={ms.id} className="relative border border-border rounded-lg p-5 space-y-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-4 right-4"
                      onClick={() => removeMilestone(ms.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Input
                      placeholder="Milestone name…"
                      value={ms.name}
                      onChange={(e) => updateMilestone(ms.id, { name: e.target.value })}
                      containerClassName="pr-10"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <InputGroup
                        label="Start"
                        leading="Week"
                        type="number"
                        min={0}
                        value={ms.startWeek ?? ''}
                        onChange={(e) => updateMilestone(ms.id, { startWeek: Number(e.target.value) })}
                      />
                      <InputGroup
                        label="End"
                        leading="Week"
                        type="number"
                        min={0}
                        value={ms.endWeek ?? ''}
                        onChange={(e) => updateMilestone(ms.id, { endWeek: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={addMilestone}>
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">{footerHints[step]}</p>
            <div className="flex justify-end gap-2">
              {step === 1 ? (
                <>
                  <Button variant="outline" onClick={onCancel}>Cancel</Button>
                  <Button onClick={onNext}>Next</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onBack}>Back</Button>
                  <Button onClick={onCreate}>Create Project</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({
  project,
  onConfirm,
  onCancel,
}: {
  project: Project
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-xl border shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-1">Delete project?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          <span className="font-medium text-foreground">{project.name}</span> and all{' '}
          {project.reports.length} {project.reports.length === 1 ? 'report' : 'reports'} will be
          permanently deleted. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProjectsPage({ store, navigate }: Props) {
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [draftProject, setDraftProject] = useState<Project | null>(null)
  const [modalStep, setModalStep] = useState<1 | 2>(1)
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false)
  const [draftErrors, setDraftErrors] = useState<
    Partial<Record<'name' | 'clientName' | 'description' | 'goal' | 'startDate' | 'endDate', string>>
  >({})

  const handleNew = () => {
    setDraftProject(createProject())
    setModalStep(1)
    setHasAttemptedCreate(false)
    setDraftErrors({})
  }

  const handleCreateDummyProject = () => {
    const dummyProject = createDummyProject()
    store.upsertProject(dummyProject)
    navigate({ name: 'project', projectId: dummyProject.id })
  }

  const handleAdvanceStep = () => {
    if (!draftProject) return
    if (modalStep === 1) {
      setHasAttemptedCreate(true)
      const errors = validateProject(draftProject)
      setDraftErrors(errors)
      if (Object.keys(errors).length > 0) return
      setHasAttemptedCreate(false)
      setDraftErrors({})
      setModalStep(2)
    }
  }

  const handleDraftChange = (patch: Partial<Project>) => {
    setDraftProject((current) => {
      if (!current) return current
      return { ...current, ...patch }
    })
  }

  const handleCreateProject = () => {
    if (!draftProject) return
    setHasAttemptedCreate(true)
    const errors = validateProject(draftProject)
    setDraftErrors(errors)
    if (Object.keys(errors).length > 0) return
    store.upsertProject(draftProject)
    setDraftProject(null)
    setHasAttemptedCreate(false)
    navigate({ name: 'project', projectId: draftProject.id })
  }

  const handleDelete = (project: Project) => {
    store.deleteProject(project.id)
    setPendingDelete(null)
  }

  return (
    <Container as="main" className="py-8">
      <div className="flex items-start justify-between mb-8">
        <PageHeader
          title="Projects"
          description="Manage your weekly status report projects"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCreateDummyProject}>
            Create Dummy Project
          </Button>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {store.projects.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-muted-foreground mb-6 text-sm">No projects yet. Create one to get started.</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={handleCreateDummyProject}>
              Create Dummy Project
            </Button>
            <Button variant="outline" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {store.projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate({ name: 'project', projectId: project.id })}
              className="flex flex-row justify-between items-start h-auto p-6 text-left bg-surface hover:cursor-pointer rounded-xl border transition-all group"
            >
              <div className="flex-col min-w-0 flex-1">
                <div className="flex w-full mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    {project.clientName && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{project.clientName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDisplayDate(project.startDate)} – {formatDisplayDate(project.endDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {project.reports.length} {project.reports.length === 1 ? 'report' : 'reports'}
                  </span>
                </div>
              </div>
     <Button
                  variant="ghost"
                  size="icon"
             
                  onClick={(e) => { e.stopPropagation(); setPendingDelete(project) }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          project={pendingDelete}
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {draftProject && (
        <ProjectSetupModal
          draft={draftProject}
          errors={hasAttemptedCreate ? draftErrors : {}}
          step={modalStep}
          onChange={handleDraftChange}
          onNext={handleAdvanceStep}
          onCreate={handleCreateProject}
          onBack={() => setModalStep(1)}
          onCancel={() => {
            setDraftProject(null)
            setModalStep(1)
            setHasAttemptedCreate(false)
            setDraftErrors({})
          }}
        />
      )}
    </Container>
  )
}
