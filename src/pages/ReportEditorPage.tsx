import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Tabs,
  TabsList,
  Tab,
  TabsPanel,
  Label,
} from '@aplo/ui'
import { Plus, Trash2, Printer, Maximize2, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NavView, Project, WeeklyReport, Achievement, Risk, ActionItem } from '../types'
import type { Store } from '../store'
import {
  uid,
  formatDisplayDate,
  getLatestReport,
  MAX_REPORT_MILESTONES,
  normalizeMilestoneProgress,
  normalizeShownMilestoneIds,
} from '../utils'
import { ReportSlide } from '../components/ReportSlide'
import { ProgressSlider } from '../components/ProgressSlider'

interface Props {
  store: Store
  navigate: (v: NavView) => void
  projectId: string
  reportId: string
}

// ─── Textarea styled to match Aplo Input ─────────────────────────────────────

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm resize-y outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsl(179_100%_21%/0.12)] placeholder:text-muted-foreground"
    />
  )
}

// ─── Scaled slide preview ─────────────────────────────────────────────────────

function ScaledPreview({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / 1920)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        onClick={onClick}
        style={{
          width: `${1920 * scale}px`,
          height: `${1080 * scale}px`,
          overflow: 'hidden',
          position: 'relative',
          borderRadius: '6px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          cursor: onClick ? 'zoom-in' : undefined,
        }}
      >
        {/* Expand hint */}
        {onClick && (
          <div
            style={{
              position: 'absolute',
              top: `${10 * scale}px`,
              right: `${10 * scale}px`,
              zIndex: 10,
              background: 'rgba(0,0,0,0.45)',
              borderRadius: '4px',
              padding: `${4 * scale}px ${6 * scale}px`,
              display: 'flex',
              alignItems: 'center',
              gap: `${4 * scale}px`,
              color: 'white',
              fontSize: `${11 * scale}px`,
              pointerEvents: 'none',
            }}
          >
            <Maximize2 style={{ width: `${12 * scale}px`, height: `${12 * scale}px` }} />
            Preview
          </div>
        )}
        <div
          style={{
            width: '1920px',
            height: '1080px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Fullscreen lightbox ──────────────────────────────────────────────────────

function FullscreenPreview({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Scale to fit viewport with padding
  const padding = 48
  const scaleX = (window.innerWidth - padding * 2) / 1920
  const scaleY = (window.innerHeight - padding * 2) / 1080
  const scale = Math.min(scaleX, scaleY)

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          background: 'rgba(255,255,255,0.12)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
        }}
      >
        <X style={{ width: '18px', height: '18px' }} />
      </button>

      {/* Slide */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `${1920 * scale}px`,
          height: `${1080 * scale}px`,
          overflow: 'hidden',
          borderRadius: '8px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            width: '1920px',
            height: '1080px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Section tab editors ──────────────────────────────────────────────────────

function StatusTab({
  report,
  onChange,
}: {
  report: WeeklyReport
  onChange: (p: Partial<WeeklyReport>) => void
}) {
  return (
    <div className="space-y-4 p-4">
      <Input
        label="Week Number"
        value={String(report.weekNumber)}
        readOnly
      />
      <Select
        label="Project Status"
        value={report.status}
        onValueChange={(v) => v && onChange({ status: v as WeeklyReport['status'] })}
      >
        <SelectItem value="on-track">On Track</SelectItem>
        <SelectItem value="at-risk">At Risk</SelectItem>
        <SelectItem value="delayed">Delayed</SelectItem>
      </Select>
      <Select
        label="Confidence Level"
        value={report.confidenceLevel != null ? String(report.confidenceLevel) : ''}
        onValueChange={(v) => v && onChange({ confidenceLevel: Number(v) })}
      >
        <SelectItem value="1">1 – Not confident</SelectItem>
        <SelectItem value="2">2 – Slightly confident</SelectItem>
        <SelectItem value="3">3 – Moderately confident</SelectItem>
        <SelectItem value="4">4 – Confident</SelectItem>
        <SelectItem value="5">5 – Extremely confident</SelectItem>
      </Select>
      <Input
        label="Report Date"
        type="date"
        value={report.reportDate}
        readOnly
        description="This is set automatically from the selected project week."
      />
    </div>
  )
}

function MilestonesTab({
  project,
  report,
  isLatestReport,
  onSetProgress,
  onToggleShown,
}: {
  project: Project
  report: WeeklyReport
  isLatestReport: boolean
  onSetProgress: (id: string, value: number) => void
  onToggleShown: (id: string, shown: boolean) => void
}) {
  const shownCount = report.shownMilestoneIds.length

  if (project.milestones.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No milestones defined for this project yet. Add them in the project's Milestones tab.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {project.milestones.map((ms) => (
        <div key={ms.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{ms.name || <span className="text-muted-foreground italic">Unnamed milestone</span>}</p>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={report.shownMilestoneIds.includes(ms.id)}
                onCheckedChange={(checked) => onToggleShown(ms.id, checked)}
                disabled={!report.shownMilestoneIds.includes(ms.id) && shownCount >= MAX_REPORT_MILESTONES}
                size="sm"
              />
              Show on this report
            </label>
          </div>
          <ProgressSlider
            value={report.milestoneProgress?.[ms.id] ?? 0}
            onChange={(v) => onSetProgress(ms.id, v)}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Showing {shownCount} of {project.milestones.length} milestones on this report.
      </p>
      <p className="text-xs text-muted-foreground">
        {isLatestReport
          ? 'This report sets the live milestone progress that new reports will inherit.'
          : 'This report keeps its own snapshot. Changing it here will not affect newer reports.'}
      </p>
    </div>
  )
}

function InsightsTab({
  report,
  onChange,
}: {
  report: WeeklyReport
  onChange: (p: Partial<WeeklyReport>) => void
}) {
  const update = (id: string, text: string) =>
    onChange({ insights: report.insights.map((i) => (i.id === id ? { ...i, text } : i)) })

  const add = () =>
    onChange({ insights: [...report.insights, { id: uid(), text: '' }] })

  const remove = (id: string) =>
    onChange({ insights: report.insights.filter((i) => i.id !== id) })

  return (
    <div className="p-4 space-y-3">
      {report.insights.map((ins) => (
        <div key={ins.id} className="flex gap-2 items-start">
          <div className="flex-1">
            <Textarea
              value={ins.text}
              onChange={(v) => update(ins.id, v)}
              placeholder="Insight or observation…"
              rows={2}
            />
          </div>
          <Button variant="ghost" size="icon-sm" className="mt-1" onClick={() => remove(ins.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={add}>
        <Plus className="w-4 h-4 mr-2" />
        Add Insight
      </Button>
    </div>
  )
}

function AchievementsTab({
  report,
  onChange,
}: {
  report: WeeklyReport
  onChange: (p: Partial<WeeklyReport>) => void
}) {
  const update = (id: string, patch: Partial<Achievement>) =>
    onChange({ achievements: report.achievements.map((item) => (item.id === id ? { ...item, ...patch } : item)) })

  const add = () =>
    onChange({ achievements: [...report.achievements, { id: uid(), text: '' }] })

  const remove = (id: string) =>
    onChange({ achievements: report.achievements.filter((item) => item.id !== id) })

  return (
    <div className="p-4 space-y-3">
      {report.achievements.map((achievement) => (
        <div key={achievement.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              ACHIEVEMENT #{report.achievements.indexOf(achievement) + 1}
            </Label>
            <Button variant="ghost" size="icon-sm" onClick={() => remove(achievement.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            value={achievement.text}
            onChange={(v) => update(achievement.id, { text: v })}
            placeholder="Describe the achievement or win..."
            rows={3}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={add}>
        <Plus className="w-4 h-4 mr-2" />
        Add Achievement
      </Button>
    </div>
  )
}

function RisksTab({
  report,
  onChange,
}: {
  report: WeeklyReport
  onChange: (p: Partial<WeeklyReport>) => void
}) {
  const update = (id: string, patch: Partial<Risk>) =>
    onChange({ risks: report.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  const add = () =>
    onChange({ risks: [...report.risks, { id: uid(), risk: '', mitigation: '' }] })

  const remove = (id: string) =>
    onChange({ risks: report.risks.filter((r) => r.id !== id) })

  return (
    <div className="p-4 space-y-3">
      {report.risks.map((risk) => (
        <div key={risk.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">RISK #{report.risks.indexOf(risk) + 1}</Label>
            <Button variant="ghost" size="icon-sm" onClick={() => remove(risk.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div>
            <Label className="text-xs mb-1">Risk or Roadblock</Label>
            <Textarea
              value={risk.risk}
              onChange={(v) => update(risk.id, { risk: v })}
              placeholder="Describe the risk or roadblock…"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs mb-1">Mitigation Plan</Label>
            <Textarea
              value={risk.mitigation}
              onChange={(v) => update(risk.id, { mitigation: v })}
              placeholder="How will this be addressed?…"
              rows={2}
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={add}>
        <Plus className="w-4 h-4 mr-2" />
        Add Risk
      </Button>
    </div>
  )
}

function ActionsTab({
  report,
  onChange,
}: {
  report: WeeklyReport
  onChange: (p: Partial<WeeklyReport>) => void
}) {
  const update = (id: string, patch: Partial<ActionItem>) =>
    onChange({ actionItems: report.actionItems.map((a) => (a.id === id ? { ...a, ...patch } : a)) })

  const add = () =>
    onChange({
      actionItems: [
        ...report.actionItems,
        { id: uid(), text: '', responsible: '', completed: false },
      ],
    })

  const remove = (id: string) =>
    onChange({ actionItems: report.actionItems.filter((a) => a.id !== id) })

  return (
    <div className="p-4 space-y-3">
      {report.actionItems.map((item) => (
        <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={item.completed}
              onCheckedChange={(c) => update(item.id, { completed: c })}
              size="sm"
            />
            <Input
              placeholder="Action item description…"
              value={item.text}
              onChange={(e) => update(item.id, { text: e.target.value })}
              containerClassName="flex-1"
            />
            <Button variant="ghost" size="icon-sm" onClick={() => remove(item.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Input
            placeholder="Responsible party…"
            value={item.responsible}
            onChange={(e) => update(item.id, { responsible: e.target.value })}
            size="sm"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={add}>
        <Plus className="w-4 h-4 mr-2" />
        Add Action Item
      </Button>
    </div>
  )
}

// ─── Main editor page ─────────────────────────────────────────────────────────

export function ReportEditorPage({ store, navigate, projectId, reportId }: Props) {
  const project = store.projects.find((p) => p.id === projectId)
  const storedReport = project?.reports.find((r) => r.id === reportId)
  const normalizedStoredReport = storedReport
    ? {
        ...storedReport,
        milestoneProgress: normalizeMilestoneProgress(project?.milestones ?? [], storedReport.milestoneProgress),
        shownMilestoneIds: normalizeShownMilestoneIds(project?.milestones ?? [], storedReport.shownMilestoneIds),
        achievements: storedReport.achievements ?? [],
      }
    : null

  const [report, setReport] = useState<WeeklyReport | null>(normalizedStoredReport)
  const [fullscreen, setFullscreen] = useState(false)
  const isFirst = useRef(true)

  // Only re-sync from store when navigating to a different report.
  // Syncing on every store change (e.g. after auto-save) would reset the
  // slider mid-drag because normalizedStoredReport is a new reference each render.
  useEffect(() => {
    setReport(normalizedStoredReport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  // Auto-save with debounce
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (!report) return
    const t = setTimeout(() => store.upsertReport(projectId, report), 500)
    return () => clearTimeout(t)
  }, [projectId, report, store])

  if (!project || !report) {
    return <div className="p-8 text-muted-foreground">Report not found.</div>
  }

  const updateReport = (patch: Partial<WeeklyReport>) =>
    setReport((current) =>
      current
        ? {
            ...current,
            ...patch,
            milestoneProgress: normalizeMilestoneProgress(
              project.milestones,
              patch.milestoneProgress ?? current.milestoneProgress,
            ),
            shownMilestoneIds: normalizeShownMilestoneIds(
              project.milestones,
              patch.shownMilestoneIds ?? current.shownMilestoneIds,
            ),
            isDraft: false,
          }
        : current,
    )

  const sortedReports = [...project.reports]
    .map((item) => ({
      ...item,
      milestoneProgress: normalizeMilestoneProgress(project.milestones, item.milestoneProgress),
      shownMilestoneIds: normalizeShownMilestoneIds(project.milestones, item.shownMilestoneIds),
      achievements: item.achievements ?? [],
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber)
  const latestReport = getLatestReport(sortedReports)
  const isLatestReport = latestReport?.id === report.id
  const currentReportIndex = sortedReports.findIndex((item) => item.id === report.id)
  const previousReport = currentReportIndex > 0 ? sortedReports[currentReportIndex - 1] : null
  const nextReport = currentReportIndex >= 0 && currentReportIndex < sortedReports.length - 1
    ? sortedReports[currentReportIndex + 1]
    : null


  const handlePrint = () => window.print()
  const handleNavigateToReport = (targetReport: WeeklyReport | null) => {
    if (!targetReport) return
    navigate({ name: 'report', projectId, reportId: targetReport.id })
  }

  const handleMilestoneProgressChange = (milestoneId: string, value: number) => {
    const nextProgress = { ...report.milestoneProgress, [milestoneId]: value }
    updateReport({ milestoneProgress: nextProgress })

    if (!isLatestReport) return

    store.upsertProject({
      ...project,
      currentMilestoneProgress: normalizeMilestoneProgress(project.milestones, {
        ...project.currentMilestoneProgress,
        [milestoneId]: value,
      }),
    })
  }

  const handleMilestoneShownToggle = (milestoneId: string, shown: boolean) => {
    const nextShownIds = shown
      ? normalizeShownMilestoneIds(project.milestones, [...report.shownMilestoneIds, milestoneId])
      : report.shownMilestoneIds.filter((id) => id !== milestoneId)

    updateReport({ shownMilestoneIds: nextShownIds })
  }

  return (
    <div className="flex h-full">
      {/* ── Left: editor panel (50%) ── */}
      <div className="w-1/2 max-w-2xl border-r border-border flex flex-col overflow-hidden bg-surface">
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="status" variant="bordered">
            <div className="sticky top-0 bg-background z-10">
              <div className="overflow-x-auto w-full pt-[15px] bg-surface">
                <TabsList className="flex min-w-max  justify-between">
                  <Tab value="status">Status</Tab>
                  <Tab value="milestones">Milestones</Tab>
                  <Tab value="insights">Insights</Tab>
                  <Tab value="achievements">Achievements</Tab>
                  <Tab value="risks">Risks</Tab>
                  <Tab value="actions">Actions</Tab>
                </TabsList>
              </div>
            </div>

            <TabsPanel value="status" keepMounted>
              <StatusTab
                report={report}
                onChange={updateReport}
              />
            </TabsPanel>
            <TabsPanel value="milestones" keepMounted>
              <MilestonesTab
                project={project}
                report={report}
                isLatestReport={isLatestReport}
                onSetProgress={handleMilestoneProgressChange}
                onToggleShown={handleMilestoneShownToggle}
              />
            </TabsPanel>
            <TabsPanel value="insights" keepMounted>
              <InsightsTab report={report} onChange={updateReport} />
            </TabsPanel>
            <TabsPanel value="achievements" keepMounted>
              <AchievementsTab report={report} onChange={updateReport} />
            </TabsPanel>
            <TabsPanel value="risks" keepMounted>
              <RisksTab report={report} onChange={updateReport} />
            </TabsPanel>
            <TabsPanel value="actions" keepMounted>
              <ActionsTab report={report} onChange={updateReport} />
            </TabsPanel>

          </Tabs>
        </div>
      </div>

      {/* ── Right: slide preview (50%) ── */}
      <div className="w-full flex flex-col overflow-hidden bg-muted/20">
        <div className="shrink-0 bg-background/80 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between ">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleNavigateToReport(previousReport)}
              disabled={!previousReport}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleNavigateToReport(nextReport)}
              disabled={!nextReport}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground font-medium">
                Week {report.weekNumber} - {formatDisplayDate(report.reportDate)}
              </p>
              {report.isDraft && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  <Sparkles className="h-3 w-3" />
                  Draft
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print / Export PDF
          </Button>
        </div>
        <div className="w-full overflow-auto p-24 flex items-center overflow-hidden">
          <ScaledPreview onClick={() => setFullscreen(true)}>
            <ReportSlide project={project} report={report} />
          </ScaledPreview>
        </div>
      </div>

      {/* ── Fullscreen lightbox ── */}
      {fullscreen && (
        <FullscreenPreview onClose={() => setFullscreen(false)}>
          <ReportSlide project={project} report={report} />
        </FullscreenPreview>
      )}

      {/* ── Print-only slide (hidden in browser) ── */}
      <div className="print-slide">
        <ReportSlide project={project} report={report} />
      </div>
    </div>
  )
}
