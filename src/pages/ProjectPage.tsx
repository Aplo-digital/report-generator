import { useState, useEffect, useRef } from 'react'
import {
  Button,
  Container,
  Input,
  FileUpload,
  Select,
  SelectItem,
  Tabs,
  TabsList,
  Tab,
  TabsPanel,
  PageHeader,
} from '@aplo/ui'
import { Trash2, ChevronRight, Plus, GripVertical } from 'lucide-react'
import type { NavView, Project, WeeklyReport, MilestoneDef, SprintLength } from '../types'
import type { Store } from '../store'
import {
  uid,
  formatDisplayDate,
  fileToBase64,
  getDefaultShownMilestoneIds,
  getLatestReport,
  getWeekDateISO,
  normalizeMilestoneProgress,
  normalizeShownMilestoneIds,
} from '../utils'
import { InputGroup } from '../components/InputGroup'

interface Props {
  store: Store
  navigate: (v: NavView) => void
  projectId: string
}

const STATUS_LABELS = { 'on-track': 'On Track', 'at-risk': 'At Risk', delayed: 'Delayed' } as const
const REPORT_SORT_LABELS = { desc: 'Newest', asc: 'Oldest' } as const

function MilestonesTab({
  project,
  onUpdate,
}: {
  project: Project
  onUpdate: (patch: Partial<Project>) => void
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const updateMilestone = (id: string, patch: Partial<MilestoneDef>) =>
    onUpdate({ milestones: project.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)) })

  const addMilestone = () =>
    onUpdate({ milestones: [...project.milestones, { id: uid(), name: '', startWeek: 0, endWeek: 1 }] })

  const removeMilestone = (id: string) =>
    onUpdate({ milestones: project.milestones.filter((m) => m.id !== id) })

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return
    const reordered = [...project.milestones]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    onUpdate({ milestones: reordered })
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <div className="space-y-4">
      <div className='max-w-sm'>
      <InputGroup
        label="Gantt view starts at"
        leading="Week"
        type="number"
        min={0}
        value={project.timelineWindowStart}
        onChange={(e) => onUpdate({ timelineWindowStart: Number(e.target.value) })}
        description="The 6-block Gantt snapshot on each report starts from this week number."
       
      />
      </div>

      {project.milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No milestones yet. Add one below.</p>
      ) : (
        <div className="space-y-2">

          {project.milestones.map((ms, idx) => (
            <div
              key={ms.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(idx) }}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
              className={[
                'flex items-end gap-3 rounded-lg border p-4 bg-surface transition-colors ',
                overIdx === idx && dragIdx !== idx ? 'border-primary bg-primary/5' : 'border-border',
                dragIdx === idx ? 'opacity-40' : '',
              ].join(' ')}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
              <div className="w-full">
                <Input
                  value={ms.name}
                  onChange={(e) => updateMilestone(ms.id, { name: e.target.value })}
                  placeholder="Milestone name…"
                  label="Milestone"
                />
              </div>
              <InputGroup
              label="Start"
                leading="W"
                type="number"
                min={0}
                value={ms.startWeek ?? 0}
                onChange={(e) => updateMilestone(ms.id, { startWeek: Number(e.target.value) })}
                containerClassName="w-32"
              />
              <InputGroup
                leading="W"
                label="End"
                type="number"
                min={0}
                value={ms.endWeek ?? 1}
                onChange={(e) => updateMilestone(ms.id, { endWeek: Number(e.target.value) })}
                containerClassName="w-32"
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeMilestone(ms.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={addMilestone}>
        <Plus className="w-4 h-4 mr-2" />
        Add Milestone
      </Button>
      <p className="text-xs text-muted-foreground">
        Milestone names and timing live at the project level. New reports inherit the latest completion values automatically.
      </p>
    </div>
  )
}

const STATUS_COLORS = { 'on-track': 'bg-green-500', 'at-risk': 'bg-orange-500', delayed: 'bg-red-500' } as const

// ─── Normalize existing reports (update dates, fill missing fields) ────────────

function normalizeReports(project: Project): WeeklyReport[] {
  // Filter out isDraft reports — these are auto-generated placeholders from the
  // old flow. Any report the user actually edited has isDraft: false.
  return project.reports
    .filter((r) => !r.isDraft)
    .map((r) => ({
      ...r,
      reportDate: getWeekDateISO(project.startDate, r.weekNumber),
      milestoneProgress: normalizeMilestoneProgress(project.milestones, r.milestoneProgress),
      shownMilestoneIds: normalizeShownMilestoneIds(project.milestones, r.shownMilestoneIds),
      achievements: r.achievements ?? [],
    }))
}

function reportsChanged(a: WeeklyReport[], b: WeeklyReport[]) {
  return JSON.stringify(a) !== JSON.stringify(b)
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ProjectPage({ store, navigate, projectId }: Props) {
  const project = store.projects.find((p) => p.id === projectId)

  const [local, setLocal] = useState<Project | null>(project ? { ...project, reports: normalizeReports(project) } : null)
  const [reportSortDirection, setReportSortDirection] = useState<'asc' | 'desc'>('desc')
  const isFirst = useRef(true)

  useEffect(() => {
    if (!project) {
      // This page keeps a local editable draft, so we intentionally clear it when the route project disappears.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocal(null)
      return
    }

    const normalized = normalizeReports(project)
    if (reportsChanged(project.reports, normalized)) {
      store.upsertProject({ ...project, reports: normalized })
    }
    setLocal({ ...project, reports: normalized })
  }, [project, projectId, store])

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (!local) return
    const t = setTimeout(() => store.upsertProject(local), 500)
    return () => clearTimeout(t)
  }, [local, store])

  if (!project || !local) {
    return (
      <Container as="main" className="py-8">
        <p className="text-muted-foreground">Project not found.</p>
      </Container>
    )
  }

  const update = (patch: Partial<Project>) =>
    setLocal((current) => {
      if (!current) return current
      const next = { ...current, ...patch }
      return {
        ...next,
        currentMilestoneProgress: normalizeMilestoneProgress(next.milestones, next.currentMilestoneProgress),
        reports: normalizeReports(next),
      }
    })

  const handleLogoSelect = async (file: File) => {
    const b64 = await fileToBase64(file)
    update({ clientLogo: b64 })
  }

  const handleDeleteReport = (reportId: string) => {
    if (!confirm('Delete this report?')) return
    store.deleteReport(projectId, reportId)
  }

  const handleNewReport = () => {
    const lastReport = getLatestReport(local.reports)
    const nextWeek = lastReport ? lastReport.weekNumber + 1 : 0
    const newReport: WeeklyReport = {
      id: uid(),
      weekNumber: nextWeek,
      reportDate: getWeekDateISO(local.startDate, nextWeek),
      isDraft: false,
      status: 'on-track',
      milestoneProgress: { ...normalizeMilestoneProgress(local.milestones, local.currentMilestoneProgress) },
      shownMilestoneIds: normalizeShownMilestoneIds(
        local.milestones,
        getDefaultShownMilestoneIds(local.milestones, nextWeek, local.sprintLength ?? 1),
      ),
      insights: [],
      achievements: [],
      risks: [],
      actionItems: [],
    }
    store.upsertReport(projectId, newReport)
    navigate({ name: 'report', projectId, reportId: newReport.id })
  }

  const handleDeleteProject = () => {
    if (!confirm(`Delete "${project.name}" and all its reports?`)) return
    store.deleteProject(projectId)
    navigate({ name: 'projects' })
  }

  const allReports = [...local.reports].sort((a, b) => b.weekNumber - a.weekNumber)
  const visibleReports = [...allReports].sort((a, b) =>
    reportSortDirection === 'asc'
      ? a.reportDate.localeCompare(b.reportDate)
      : b.reportDate.localeCompare(a.reportDate)
  )

  return (
    <Container as="main" className="py-8">
      <div className="flex items-end justify-between mb-8">
        <PageHeader
          eyebrow={local.clientName || undefined}
          title={local.name || 'Untitled Project'}
        />
        <Button onClick={handleNewReport}>
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      <Tabs defaultValue="reports" variant="bordered">
        <TabsList className="mb-8">
          <Tab value="reports">Reports ({allReports.length})</Tab>
          <Tab value="milestones">Milestones</Tab>
          <Tab value="settings">Settings</Tab>
        </TabsList>

        {/* ── Milestones tab ── */}
        <TabsPanel value="milestones">
          <MilestonesTab project={local} onUpdate={update} />
        </TabsPanel>

        {/* ── Settings tab ── */}
        <TabsPanel value="settings">
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Project Name"
                value={local.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Design System Mobilisation"
              />
              <Input
                label="Client Name"
                value={local.clientName}
                onChange={(e) => update({ clientName: e.target.value })}
                placeholder="Flinders University"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                value={local.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Brief description of the project…"
                rows={3}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm resize-y outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsl(179_100%_21%/0.12)] placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Project Goal</label>
              <textarea
                value={local.goal}
                onChange={(e) => update({ goal: e.target.value })}
                placeholder="What does success look like?…"
                rows={3}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm resize-y outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsl(179_100%_21%/0.12)] placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={local.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                value={local.endDate}
                onChange={(e) => update({ endDate: e.target.value })}
              />
              <div className="col-span-2">
                <Select
                  label="Report Interval"
                  value={String(local.sprintLength ?? 1)}
                  onValueChange={(v) => v && update({ sprintLength: Number(v) as SprintLength })}
                  description="How often you report progress — each block on the timeline represents this duration."
                >
                  <SelectItem value="1">1 week</SelectItem>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="3">3 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Client Logo</label>
              {local.clientLogo && (
                <div className="mb-3 flex items-center gap-3">
                  <img src={local.clientLogo} alt="logo" className="h-10 object-contain" />
                  <Button variant="ghost" size="sm" onClick={() => update({ clientLogo: null })}>
                    Remove
                  </Button>
                </div>
              )}
              <FileUpload
                accept={['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']}
                maxSizeMb={5}
                label="Upload client logo"
                hint="PNG, JPG, SVG or WebP up to 5 MB"
                onFileSelect={handleLogoSelect}
              />
            </div>

            <p className="text-xs text-muted-foreground">Changes are saved automatically.</p>

            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-destructive mb-2">Danger Zone</p>
              <Button variant="destructive" size="sm" onClick={handleDeleteProject}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </Button>
            </div>
          </div>
        </TabsPanel>

        {/* ── Reports tab ── */}
        <TabsPanel value="reports">
          <div className="flex flex-col gap-4 mb-6 ">
            {allReports.length > 0 && (
              <div className="flex items-center gap-4 w-full">
                <p className="text-sm text-muted-foreground">
                  {allReports.length} report{allReports.length !== 1 ? 's' : ''} for this project.
                </p>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Sort by</span>
                  <div className="w-36">
                    <Select
                      label=""
                      value={REPORT_SORT_LABELS[reportSortDirection]}
                      onValueChange={(value) =>
                        value && setReportSortDirection(value === REPORT_SORT_LABELS.desc ? 'desc' : 'asc')
                      }
                      containerClassName="mb-0"
                      placeholder="Sort"
                    >
                      <SelectItem value={REPORT_SORT_LABELS.desc}>{REPORT_SORT_LABELS.desc}</SelectItem>
                      <SelectItem value={REPORT_SORT_LABELS.asc}>{REPORT_SORT_LABELS.asc}</SelectItem>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {visibleReports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No reports yet. Create your first one above.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => navigate({ name: 'report', projectId, reportId: report.id })}
                  className="flex items-center gap-4 py-4 px-4 transition-colors hover:bg-accent cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      className="font-medium text-sm text-primary hover:underline"
                      onClick={() => navigate({ name: 'report', projectId, reportId: report.id })}
                    >
                      Week {report.weekNumber}
                    </button>
                    <span className="text-muted-foreground text-sm">·</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDisplayDate(report.reportDate)}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white ${STATUS_COLORS[report.status]}`}
                  >
                    {STATUS_LABELS[report.status]}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteReport(report.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate({ name: 'report', projectId, reportId: report.id })
                      }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsPanel>
      </Tabs>
    </Container>
  )
}
