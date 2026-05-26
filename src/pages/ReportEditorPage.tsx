import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Input,
  Select,
  SelectItem,
  Switch,
  Label,
} from '@aplo/ui'
import {
  Plus,
  Trash2,
  Printer,
  Maximize2,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Flag,
  Lightbulb,
  Trophy,
  TriangleAlert,
  CheckSquare,
  ZoomIn,
  ZoomOut,
  Scan,
  GripVertical,
} from 'lucide-react'
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

type SectionId = 'status' | 'milestones' | 'insights' | 'achievements' | 'risks' | 'actions'
type DragState = { startX: number; startWidth: number } | null

const PANEL_STORAGE_KEY = 'report-editor-panels'
const EDITOR_MIN_WIDTH = 440
const EDITOR_MAX_WIDTH = 780

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function getStoredPanels() {
  if (typeof window === 'undefined') return { editorWidth: 560 }

  try {
    const stored = JSON.parse(window.localStorage.getItem(PANEL_STORAGE_KEY) ?? '{}') as {
      editorWidth?: number
    }

    return {
      editorWidth: clamp(stored.editorWidth ?? 560, EDITOR_MIN_WIDTH, EDITOR_MAX_WIDTH),
    }
  } catch {
    return { editorWidth: 560 }
  }
}

function Tooltip({
  label,
  children,
  className = '',
  side = 'top',
  compactOnly = false,
}: {
  label: string
  children: React.ReactNode
  className?: string
  side?: 'top' | 'right' | 'bottom'
  compactOnly?: boolean
}) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    if (!compactOnly || typeof window === 'undefined') return

    const query = window.matchMedia('(max-width: 1024px)')
    const update = () => setIsCompact(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [compactOnly])

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      const gap = 10
      if (side === 'right') {
        setPosition({ top: rect.top + rect.height / 2, left: rect.right + gap })
      } else if (side === 'bottom') {
        setPosition({ top: rect.bottom + gap, left: rect.left + rect.width / 2 })
      } else {
        setPosition({ top: rect.top - gap, left: rect.left + rect.width / 2 })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, side])

  const hidden = compactOnly && !isCompact
  const transform =
    side === 'right'
      ? `translate(${open ? '0' : '-4px'}, -50%)`
      : side === 'bottom'
        ? `translate(-50%, ${open ? '0' : '-4px'})`
        : `translate(-50%, ${open ? '0' : '4px'})`

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && !hidden && typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white shadow-2xl ring-1 ring-neutral-700 transition-transform duration-150 ease-out"
            style={{
              top: position.top,
              left: position.left,
              transform,
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  )
}

// ─── Textarea styled to match Aplo Input ─────────────────────────────────────

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  autoFocus = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  autoFocus?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      autoFocus={autoFocus}
      className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm resize-y outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsl(179_100%_21%/0.12)] placeholder:text-muted-foreground text-foreground"
    />
  )
}

function AddShortcutHint() {
  return (
    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 leading-none ">Shift</kbd>
      <span>+</span>
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 leading-none ">Enter</kbd>
    </span>
  )
}

function AddItemButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button variant="outline" size="sm" className="w-full" onClick={onClick}>
      <span className="flex w-full items-center justify-between gap-3">
        <span className="inline-flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          {children}
        </span>
        <AddShortcutHint />
      </span>
    </Button>
  )
}

function isAddShortcutEvent(e: Pick<KeyboardEvent | React.KeyboardEvent, 'key' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'> & {
  nativeEvent?: { isComposing?: boolean }
  isComposing?: boolean
}) {
  if (
    e.key !== 'Enter' ||
    !e.shiftKey ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey ||
    e.nativeEvent?.isComposing ||
    e.isComposing
  ) {
    return false
  }

  return true
}

function useAddItemShortcut(add: (focusNewItem?: boolean) => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isAddShortcutEvent(event)) return
      event.preventDefault()
      add(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [add])
}

// ─── Scaled slide preview ─────────────────────────────────────────────────────

function ScaledPreview({
  children,
  onClick,
  zoom = 1,
}: {
  children: React.ReactNode
  onClick?: () => void
  zoom?: number
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

  const renderedScale = scale * zoom

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        onClick={onClick}
        style={{
          width: `${1920 * renderedScale}px`,
          height: `${1080 * renderedScale}px`,
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
              top: `${10 * renderedScale}px`,
              right: `${10 * renderedScale}px`,
              zIndex: 10,
              background: 'rgba(0,0,0,0.45)',
              borderRadius: '4px',
              padding: `${4 * renderedScale}px ${6 * renderedScale}px`,
              display: 'flex',
              alignItems: 'center',
              gap: `${4 * renderedScale}px`,
              color: 'white',
              fontSize: `${11 * renderedScale}px`,
              pointerEvents: 'none',
            }}
          >
            <Maximize2 style={{ width: `${12 * renderedScale}px`, height: `${12 * renderedScale}px` }} />
            Preview
          </div>
        )}
        <div
          style={{
            width: '1920px',
            height: '1080px',
            transform: `scale(${renderedScale})`,
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
      <span style={{ position: 'fixed', top: '16px', right: '16px' }}>
        <Tooltip label="Close preview" side="bottom">
          <button
            onClick={onClose}
            aria-label="Close preview"
            style={{
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
        </Tooltip>
      </span>

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
  onEditMilestones,
}: {
  project: Project
  report: WeeklyReport
  isLatestReport: boolean
  onSetProgress: (id: string, value: number) => void
  onToggleShown: (id: string, shown: boolean) => void
  onEditMilestones: () => void
}) {
  const shownCount = report.shownMilestoneIds.length
  const cappedShownCount = Math.min(shownCount, MAX_REPORT_MILESTONES)

  if (project.milestones.length === 0) {
    return (
      <div className="p-4 space-y-3 text-sm text-muted-foreground">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">Report showing 0/{MAX_REPORT_MILESTONES}</p>
          <Button variant="ghost" size="sm" onClick={onEditMilestones}>
            Edit milestones
          </Button>
        </div>
        <p>No milestones defined for this project yet.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Report showing {cappedShownCount}/{MAX_REPORT_MILESTONES}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Toggle which milestones appear in the PDF.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onEditMilestones}>
          Edit milestones
        </Button>
      </div>
      {project.milestones.map((ms) => (
        <div key={ms.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{ms.name || <span className="text-muted-foreground italic">Unnamed milestone</span>}</p>
            <label className="shrink-0">
              <span className="sr-only">Show {ms.name || 'milestone'} on PDF</span>
              <Switch
                checked={report.shownMilestoneIds.includes(ms.id)}
                onCheckedChange={(checked) => onToggleShown(ms.id, checked)}
                disabled={!report.shownMilestoneIds.includes(ms.id) && shownCount >= MAX_REPORT_MILESTONES}
                size="sm"
                className="milestone-switch"
              />
            </label>
          </div>
          <ProgressSlider
            value={report.milestoneProgress?.[ms.id] ?? 0}
            onChange={(v) => onSetProgress(ms.id, v)}
          />
        </div>
      ))}
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
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const update = (id: string, text: string) =>
    onChange({ insights: report.insights.map((i) => (i.id === id ? { ...i, text } : i)) })

  const add = (focusNewItem = false) => {
    const id = uid()
    if (focusNewItem) setFocusedItemId(id)
    onChange({ insights: [...report.insights, { id, text: '' }] })
  }
  useAddItemShortcut(add)

  const remove = (id: string) =>
    onChange({ insights: report.insights.filter((i) => i.id !== id) })

  return (
    <div className="p-4 space-y-3">
      {report.insights.map((ins, idx) => (
        <div key={ins.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">INSIGHT #{idx + 1}</Label>
            <Tooltip label="Remove insight">
              <Button variant="ghost" size="icon-sm" onClick={() => remove(ins.id)} aria-label="Remove insight">
                <Trash2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
          <Textarea
            value={ins.text}
            onChange={(v) => update(ins.id, v)}
            placeholder="Insight or observation…"
            rows={2}
            autoFocus={focusedItemId === ins.id}
          />
        </div>
      ))}
      <AddItemButton onClick={add}>
        Add Insight
      </AddItemButton>
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
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const update = (id: string, patch: Partial<Achievement>) =>
    onChange({ achievements: report.achievements.map((item) => (item.id === id ? { ...item, ...patch } : item)) })

  const add = (focusNewItem = false) => {
    const id = uid()
    if (focusNewItem) setFocusedItemId(id)
    onChange({ achievements: [...report.achievements, { id, text: '' }] })
  }
  useAddItemShortcut(add)

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
            <Tooltip label="Remove achievement">
              <Button variant="ghost" size="icon-sm" onClick={() => remove(achievement.id)} aria-label="Remove achievement">
                <Trash2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
          <Textarea
            value={achievement.text}
            onChange={(v) => update(achievement.id, { text: v })}
            placeholder="Describe the achievement or win..."
            rows={3}
            autoFocus={focusedItemId === achievement.id}
          />
        </div>
      ))}
      <AddItemButton onClick={add}>
        Add Achievement
      </AddItemButton>
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
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const update = (id: string, patch: Partial<Risk>) =>
    onChange({ risks: report.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  const add = (focusNewItem = false) => {
    const id = uid()
    if (focusNewItem) setFocusedItemId(id)
    onChange({ risks: [...report.risks, { id, risk: '', mitigation: '' }] })
  }
  useAddItemShortcut(add)

  const remove = (id: string) =>
    onChange({ risks: report.risks.filter((r) => r.id !== id) })

  return (
    <div className="p-4 space-y-3">
      {report.risks.map((risk) => (
        <div key={risk.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">RISK #{report.risks.indexOf(risk) + 1}</Label>
            <Tooltip label="Remove risk">
              <Button variant="ghost" size="icon-sm" onClick={() => remove(risk.id)} aria-label="Remove risk">
                <Trash2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
          <div>
            <Label className="text-xs mb-1">Risk or Roadblock</Label>
            <Textarea
              value={risk.risk}
              onChange={(v) => update(risk.id, { risk: v })}
              placeholder="Describe the risk or roadblock…"
              rows={2}
              autoFocus={focusedItemId === risk.id}
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
      <AddItemButton onClick={add}>
        Add Risk
      </AddItemButton>
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
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const update = (id: string, patch: Partial<ActionItem>) =>
    onChange({ actionItems: report.actionItems.map((a) => (a.id === id ? { ...a, ...patch } : a)) })

  const add = (focusNewItem = false) => {
    const id = uid()
    if (focusNewItem) setFocusedItemId(id)
    onChange({
      actionItems: [
        ...report.actionItems,
        { id, text: '', responsible: '', completed: false },
      ],
    })
  }
  useAddItemShortcut(add)

  const remove = (id: string) =>
    onChange({ actionItems: report.actionItems.filter((a) => a.id !== id) })

  return (
    <div className="p-4 space-y-3">
      {report.actionItems.map((item, idx) => (
        <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">ACTION #{idx + 1}</Label>
            <Tooltip label="Remove action item">
              <Button variant="ghost" size="icon-sm" onClick={() => remove(item.id)} aria-label="Remove action item">
                <Trash2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
          <div>
            <Label className="text-xs mb-1">Action Item</Label>
            <Textarea
              value={item.text}
              onChange={(v) => update(item.id, { text: v })}
              placeholder="Describe the action item…"
              rows={2}
              autoFocus={focusedItemId === item.id}
            />
          </div>
          <div>
            <Label className="text-xs mb-1">Responsible</Label>
            <Textarea
              value={item.responsible}
              onChange={(v) => update(item.id, { responsible: v })}
              placeholder="Who is responsible?…"
              rows={1}
            />
          </div>
        </div>
      ))}
      <AddItemButton onClick={add}>
        Add Action Item
      </AddItemButton>
    </div>
  )
}

// ─── Composition workspace shell ─────────────────────────────────────────────

function ResizeHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className="group absolute bottom-0 top-0 z-20 flex w-6 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center"
      style={{ left: 'calc(var(--sidebar-width) + var(--editor-width))' }}
    >
      <div className="flex h-10 w-6 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground opacity-70 shadow-sm transition-all group-hover:border-primary/50 group-hover:bg-background group-hover:text-primary group-hover:opacity-100">
        <GripVertical className="h-4 w-4" />
      </div>
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
  const [activeSection, setActiveSection] = useState<SectionId>('status')
  const [{ editorWidth }, setPanelWidths] = useState(getStoredPanels)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [dragState, setDragState] = useState<DragState>(null)
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
    const t = setTimeout(() => store.upsertReport(projectId, report), 1200)
    return () => clearTimeout(t)
  }, [projectId, report, store])

  useEffect(() => {
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify({ editorWidth }))
  }, [editorWidth])

  useEffect(() => {
    if (!dragState) return

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - dragState.startX
      setPanelWidths({
        editorWidth: clamp(dragState.startWidth + delta, EDITOR_MIN_WIDTH, EDITOR_MAX_WIDTH),
      })
    }

    const stopDragging = () => setDragState(null)

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging, { once: true })

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
    }
  }, [dragState])

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

  const sections: Array<{
    id: SectionId
    label: string
    icon: React.ComponentType<{ className?: string }>
  }> = [
    {
      id: 'status',
      label: 'Status',
      icon: Gauge,
    },
    {
      id: 'milestones',
      label: 'Milestones',
      icon: Flag,
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: Lightbulb,
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Trophy,
    },
    {
      id: 'risks',
      label: 'Risks',
      icon: TriangleAlert,
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: CheckSquare,
    },
  ]
  const activeSectionConfig = sections.find((section) => section.id === activeSection) ?? sections[0]

  const renderSectionEditor = () => {
    switch (activeSection) {
      case 'status':
        return <StatusTab report={report} onChange={updateReport} />
      case 'milestones':
        return (
          <MilestonesTab
            project={project}
            report={report}
            isLatestReport={isLatestReport}
            onSetProgress={handleMilestoneProgressChange}
            onToggleShown={handleMilestoneShownToggle}
            onEditMilestones={() => navigate({ name: 'project', projectId, tab: 'milestones' })}
          />
        )
      case 'insights':
        return <InsightsTab report={report} onChange={updateReport} />
      case 'achievements':
        return <AchievementsTab report={report} onChange={updateReport} />
      case 'risks':
        return <RisksTab report={report} onChange={updateReport} />
      case 'actions':
        return <ActionsTab report={report} onChange={updateReport} />
      default:
        return null
    }
  }

  const renderSectionNav = () => (
    <aside className="report-editor-sidebar relative z-30 flex h-full flex-col overflow-visible border-r border-border bg-surface">
      <nav className="flex-1 space-y-1 p-2">
        {sections.map((section) => {
          const Icon = section.icon
          const active = section.id === activeSection
          const item = (
            <button
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={[
                'report-editor-sidebar-item flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              ].join(' ')}
              aria-label={section.label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="report-editor-sidebar-label min-w-0 font-medium">{section.label}</span>
            </button>
          )

          return (
            <Tooltip
              key={section.id}
              label={section.label}
              side="right"
              className="report-editor-sidebar-tooltip w-full"
              compactOnly
            >
              {item}
            </Tooltip>
          )
        })}
      </nav>
    </aside>
  )

  const renderPreviewPanel = () => (
    <section className="flex h-full min-w-0 flex-col overflow-hidden bg-muted/20">
      <div className="shrink-0 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Tooltip label="Previous report" side="bottom">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleNavigateToReport(previousReport)}
                disabled={!previousReport}
                aria-label="Previous report"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Tooltip>
            <Tooltip label="Next report" side="bottom">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleNavigateToReport(nextReport)}
                disabled={!nextReport}
                aria-label="Next report"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Tooltip>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  Week {report.weekNumber} - {formatDisplayDate(report.reportDate)}
                </p>
                {report.isDraft && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                    <Sparkles className="h-3 w-3" />
                    Draft
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Focus: {activeSectionConfig.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip label="Zoom out" side="bottom">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPreviewZoom((current) => clamp(Number((current - 0.1).toFixed(2)), 0.7, 1.6))}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip label="Reset preview zoom" side="bottom">
              <button
                type="button"
                onClick={() => setPreviewZoom(1)}
                className="h-8 min-w-14 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {Math.round(previewZoom * 100)}%
              </button>
            </Tooltip>
            <Tooltip label="Zoom in" side="bottom">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPreviewZoom((current) => clamp(Number((current + 0.1).toFixed(2)), 0.7, 1.6))}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip label="Fit width" side="bottom">
              <Button variant="ghost" size="icon-sm" onClick={() => setPreviewZoom(1)} aria-label="Fit width">
                <Scan className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8 md:p-14">
        <div className="mx-auto flex min-h-full w-full max-w-[1500px] items-start">
          <ScaledPreview zoom={previewZoom} onClick={() => setFullscreen(true)}>
            <ReportSlide project={project} report={report} />
          </ScaledPreview>
        </div>
      </div>
    </section>
  )

  const renderEditorPanel = () => (
    <main className="flex h-full min-w-0 flex-col overflow-hidden border-r border-border bg-card">
      <div className="flex-1 overflow-y-auto bg-card">
        <div className="mx-auto w-full max-w-3xl pb-10">{renderSectionEditor()}</div>
      </div>
    </main>
  )

  return (
    <div className="h-full overflow-auto bg-background">
      <div
        className="report-editor-workspace relative grid h-full min-h-[720px]"
        style={{
          '--editor-width': `${editorWidth}px`,
        } as React.CSSProperties}
      >
        {renderSectionNav()}
        {renderEditorPanel()}
        {renderPreviewPanel()}
        <ResizeHandle
          onPointerDown={(event) => setDragState({ startX: event.clientX, startWidth: editorWidth })}
        />
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
