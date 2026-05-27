import type { CSSProperties } from 'react'
import type { Project, WeeklyReport } from '../types'
import AploLogo from '../assets/Aplo.svg'
import {
  formatSlideDate,
  formatWeekDate,
  getProjectWeekCount,
  getWeekStartDate,
  MAX_REPORT_MILESTONES,
  TIMELINE_BLOCK_COUNT,
} from '../utils'

export interface ReportSlideProps {
  project: Project
  report: WeeklyReport
  id?: string
}

const STATUS_CONFIG = {
  'on-track': { bg: '#16a34a', label: 'ON TRACK' },
  'at-risk': { bg: '#ea580c', label: 'AT RISK' },
  delayed: { bg: '#dc2626', label: 'DELAYED' },
} as const

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '1.5px',
        color: '#323232',
        textTransform: 'uppercase',
        marginBottom: '6px',
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <SectionLabel>{children}</SectionLabel>
      <div style={{ height: '1px', background: '#e5e7eb' }} />
    </div>
  )
}

// ─── Milestones ───────────────────────────────────────────────────────────────

function MilestoneRow({ name, progress }: { name: string; progress: number }) {
  const done = progress === 100
  const color = done ? '#16a34a' : '#1f2937'
  const label = name.trim() || 'Milestone'
  const isFallbackLabel = !name.trim()

  return (
    <div
      style={{
        paddingBottom: '10px',
        marginBottom: '10px',
      }}
    >
      <div style={{ fontSize: '14px', color: isFallbackLabel ? '#9ca3af' : '#1f2937', marginBottom: '6px' }}>
        {label}
      </div>
      {/*
        paddingTop gives the arrow room above the track so it isn't clipped.
        paddingInline keeps the arrow within bounds at 0% and 100%.
      */}
      <div style={{ paddingTop: '12px', paddingLeft: '6px', paddingRight: '6px' }}>
        <div style={{ position: 'relative', height: '2px', background: '#e5e7eb' }}>
          {/* Filled bar */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '2px',
              width: `${progress}%`,
              background: color,
            }}
          />
          {/* Arrow — tip (bottom of ▼) sits on the line via top: -1em */}
          <div
            style={{
              position: 'absolute',
              left: `${progress}%`,
              top: '-1em',
              transform: 'translateX(-50%)',
              fontSize: '12px',
              color,
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            ▼
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Risks table ──────────────────────────────────────────────────────────────

function RisksTable({ risks }: { risks: WeeklyReport['risks'] }) {
  const cell: CSSProperties = {
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    fontSize: '12px',
    lineHeight: '1.55',
    color: '#374151',
    verticalAlign: 'top',
    textAlign: 'left',
    fontWeight: 'bold'
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...cell, background: '#f9fafb', fontWeight: 600, fontSize: '11px', width: '42%' }}>
            Risk or Roadblock
          </th>
          <th style={{ ...cell, background: '#f9fafb', fontWeight: 600, fontSize: '11px' }}>
            Mitigation plan
          </th>
        </tr>
      </thead>
      <tbody>
        {risks.map((risk) => (
          <tr key={risk.id}>
            <td style={cell}>{risk.risk}</td>
            <td style={cell}>{risk.mitigation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Action items table ───────────────────────────────────────────────────────

function ActionItemsTable({ items }: { items: WeeklyReport['actionItems'] }) {
  const cell: CSSProperties = {
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    fontSize: '12px',
    lineHeight: '1.55',
    color: '#374151',
    verticalAlign: 'top',
    textAlign: 'left'
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...cell, background: '#f9fafb', fontWeight: 600, fontSize: '11px' }}>
            Action Item
          </th>
          <th style={{ ...cell, background: '#f9fafb', fontWeight: 600, fontSize: '11px', width: '30%' }}>
            Responsible
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td style={cell}>{item.text}</td>
            <td style={cell}>{item.responsible}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Insights & Achievements ──────────────────────────────────────────────────

function StarIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"
      style={{ flexShrink: 0, marginTop: '2px' }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="#2563eb"
      style={{ flexShrink: 0, marginTop: '2px' }}
    >
      <path d="M9 21h6a1 1 0 0 0 1-1v-1H8v1a1 1 0 0 0 1 1Z" />
      <path d="M8 17h8v-1.2c0-1.2.5-2.3 1.3-3.2A7 7 0 1 0 6.7 12.6c.8.9 1.3 2 1.3 3.2V17Z" />
    </svg>
  )
}

function InsightsAndAchievements({
  insights,
  achievements,
}: {
  insights: WeeklyReport['insights']
  achievements: WeeklyReport['achievements']
}) {
  type Entry = { kind: 'achievement' | 'insight'; id: string; text: string }
  const items: Entry[] = [
    ...achievements.map((a) => ({ kind: 'achievement' as const, id: a.id, text: a.text })),
    ...insights.map((i) => ({ kind: 'insight' as const, id: i.id, text: i.text })),
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{ display: 'flex', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}
        >
          {item.kind === 'achievement' ? <StarIcon /> : <InfoIcon />}
          <div style={{ fontSize: '14px', lineHeight: '1.55', color: '#374151' }}>{item.text}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Gantt timeline ───────────────────────────────────────────────────────────

const NAME_W = 180
const WEEK_W = 230
const MAX_TIMELINE_MILESTONES = 6

function getTimelineWindowStart(currentSprint: number, totalSprints: number): number {
  if (totalSprints <= TIMELINE_BLOCK_COUNT) return 0
  return Math.max(0, Math.min(currentSprint - 2, totalSprints - TIMELINE_BLOCK_COUNT))
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, progress))
}

function prioritizeMilestonesByIds(
  milestones: Project['milestones'],
  preferredIds: string[],
  limit: number,
) {
  const preferredIdSet = new Set(preferredIds)
  const preferred = milestones.filter((milestone) => preferredIdSet.has(milestone.id))
  const remaining = milestones.filter((milestone) => !preferredIdSet.has(milestone.id))

  return [...preferred, ...remaining].slice(0, limit)
}

function timelineMilestonesForWindow(
  milestones: Project['milestones'],
  windowStart: number,
  windowEnd: number,
) {
  if (milestones.length <= MAX_TIMELINE_MILESTONES) return milestones

  const active = milestones.filter((milestone) => {
    const start = milestone.startWeek ?? 0
    const end = milestone.endWeek ?? start
    return start <= windowEnd && end >= windowStart
  })

  return prioritizeMilestonesByIds(
    milestones,
    active.map((milestone) => milestone.id),
    MAX_TIMELINE_MILESTONES,
  )
}

interface TimelineProps {
  tasks: Project['milestones']
  milestoneProgress: Record<string, number>
  projectStartDate: string
  currentSprint: number
  totalSprints: number
  sprintLength: number
}

function TimelineChart({ tasks, milestoneProgress, projectStartDate, currentSprint, totalSprints, sprintLength }: TimelineProps) {
  const windowStart = getTimelineWindowStart(currentSprint, totalSprints)
  const blocks = Array.from({ length: Math.min(TIMELINE_BLOCK_COUNT, totalSprints) }, (_, i) => {
    const blockNum = windowStart + i
    return { blockNum, date: getWeekStartDate(projectStartDate, blockNum * sprintLength) }
  })
  const currentIdx = blocks.findIndex((b) => b.blockNum === currentSprint)
  const visibleTasks = timelineMilestonesForWindow(
    tasks,
    windowStart,
    windowStart + blocks.length - 1,
  )
  const timelineWidth = NAME_W + blocks.length * WEEK_W

  return (
    <div style={{ fontSize: '12px' }}>
      {/* "We are here" row — sits above the dark header so week numbers remain visible */}
      <div style={{ display: 'flex', marginBottom: '4px' }}>
        <div style={{ width: `${NAME_W}px`, flexShrink: 0 }} />
        {blocks.map(({ blockNum }, idx) => (
          <div
            key={blockNum}
            style={{ width: `${WEEK_W}px`, flexShrink: 0, display: 'flex', justifyContent: 'center' }}
          >
            {idx === currentIdx && (
              <div
                style={{
                  width: `${WEEK_W - 20}px`,
                  background: '#e11d48',
                  color: 'white',
                  padding: '3px 0',
                  fontSize: '10px',
                  fontWeight: 700,
                  lineHeight: '1.4',
                  borderRadius: '4px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                We are here
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Block header row */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: `${NAME_W}px`, flexShrink: 0 }} />
        {blocks.map(({ blockNum, date }, idx) => (
          <div
            key={blockNum}
            style={{
              width: `${WEEK_W}px`,
              height: '52px',
              background: '#1e293b',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: idx > 0 ? '1px solid #334155' : 'none',
              borderRadius: idx === 0 ? '4px 0 0 0' : idx === blocks.length - 1 ? '0 4px 0 0' : '0',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '18px' }}>{blockNum + 1}</div>
            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
              {formatWeekDate(date)}
            </div>
          </div>
        ))}
      </div>

      {/* Task rows */}
      {visibleTasks.map((task) => {
        const startWeek = task.startWeek ?? 0
        const endWeek = task.endWeek ?? 1
        const progress = clampProgress(milestoneProgress[task.id] ?? 0)
        const taskLabel = task.name.trim() || 'Milestone'
        const isFallbackLabel = !task.name.trim()
        const windowEnd = windowStart + blocks.length - 1
        const isVisibleInWindow = !(endWeek < windowStart || startWeek > windowEnd)

        const barStartIdx = Math.max(0, startWeek - windowStart)
        const barEndIdx = Math.min(blocks.length - 1, endWeek - windowStart)
        const barSpan = barEndIdx - barStartIdx + 1

        return (
          <div
            key={task.id}
            style={{
              display: 'flex',
              width: `${timelineWidth}px`,
              height: '36px',
              alignItems: 'center',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <div
              style={{
                width: `${NAME_W}px`,
                flexShrink: 0,
                fontSize: '14px',
                color: isFallbackLabel ? '#9ca3af' : '#374151',
                paddingRight: '12px',
              }}
            >
              {taskLabel}
            </div>
            <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
              {blocks.map(({ blockNum }, idx) => (
                <div
                  key={blockNum}
                  style={{
                    width: `${WEEK_W}px`,
                    height: '100%',
                    background: idx === currentIdx ? '#f8fafc' : 'transparent',
                    borderLeft: '1px solid #e5e7eb',
                  }}
                />
              ))}
              {isVisibleInWindow && barSpan > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${barStartIdx * WEEK_W + 8}px`,
                    width: `${barSpan * WEEK_W - 16}px`,
                    height: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: '#16a34a',
                      borderRadius: progress === 100 ? '3px' : '3px 0 0 3px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}

      <div
        style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#323232',
          textAlign: 'right',
          width: `${timelineWidth}px`,
        }}
      >
        * scheduling of activities is indicative and activities may be readjusted
      </div>
    </div>
  )
}

// ─── Root slide ───────────────────────────────────────────────────────────────

export function ReportSlide({ project, report, id }: ReportSlideProps) {
  const statusConfig = STATUS_CONFIG[report.status]
  const statusMilestones = project.milestones.length <= MAX_REPORT_MILESTONES
    ? project.milestones
    : prioritizeMilestonesByIds(project.milestones, report.shownMilestoneIds, MAX_REPORT_MILESTONES)
  const hiddenMilestoneCount = Math.max(0, project.milestones.length - statusMilestones.length)
  const projectWeekCount = getProjectWeekCount(project.startDate, project.endDate)
  const totalSprints = Math.max(1, Math.ceil(projectWeekCount / (project.sprintLength ?? 1)))
  const currentSprint = Math.max(0, Math.min(
    Math.floor(report.weekNumber / (project.sprintLength ?? 1)),
    totalSprints - 1,
  ))
  const projectGoal = project.goal.trim()

  return (
    <div
      id={id}
      style={{
        width: '1920px',
        height: '1080px',
        background: '#ffffff',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '52px 64px 44px',
        boxSizing: 'border-box',
        color: '#111827',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div style={{ flexShrink: 0, marginBottom: '22px' }}>
        {/* Row 1: subtitle + logos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div
            style={{
              fontSize: '14px',
              letterSpacing: '2px',
              color: '#0c0c0c',
              textTransform: 'uppercase',
            }}
          >
            STATUS REPORT <span style={{color: '#cccccc'}}> |</span>  {formatSlideDate(report.reportDate)}   <span style={{color: '#cccccc'}}> |</span> WEEK {report.weekNumber}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img src={AploLogo} alt="Aplo" style={{ height: '32px', objectFit: 'contain' }} />
            {project.clientLogo && (
              <img
                src={project.clientLogo}
                alt={project.clientName}
                style={{ height: '40px', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>

        {/* Row 2: project name + status chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              color: '#111827',
            }}
          >
            {project.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {report.confidenceLevel != null && (
              <span
                style={{
                  background: '#1e293b',
                  color: 'white',
                  padding: '9px 18px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                Confidence {report.confidenceLevel}/5
              </span>
            )}
            <span
              style={{
                background: statusConfig.bg,
                color: 'white',
                padding: '7px 14px',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '2px',
                borderRadius: '5px',
              }}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>

        {projectGoal && (
          <p
            style={{
              margin: '8px 0 0',
              maxWidth: '1180px',
              fontSize: '12px',
              lineHeight: 1.45,
              color: '#6b7280',
              fontWeight: 400,
            }}
          >
            <span style={{ fontWeight: 600, color: '#4b5563' }}>Project Goal:</span> {projectGoal}
          </p>
        )}

        <div style={{ height: '1px', background: '#e5e7eb', marginTop: '16px' }} />
      </div>

      {/* ── Content grid: 3 cols × 2 rows ── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '320px 3fr 3fr 4fr',
          gridTemplateRows: '390px 1fr',
          columnGap: '48px',
          rowGap: '42px',
          overflow: 'hidden',
        }}
      >
        {/* [1,1] Overall Project Status */}
        <div style={{ gridColumn: 1, gridRow: 1, overflow: 'hidden' }}>
          <SectionHeader>OVERALL PROJECT STATUS</SectionHeader>
          {statusMilestones.map((ms) => (
            <MilestoneRow key={ms.id} name={ms.name} progress={report.milestoneProgress?.[ms.id] ?? 0} />
          ))}
          {hiddenMilestoneCount > 0 && (
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600 }}>
              +{hiddenMilestoneCount} more
            </div>
          )}
        </div>

        {/* [2,1] Risks & Roadblocks */}
        <div style={{ gridColumn: 2, gridRow: 1, overflow: 'hidden' }}>
          <SectionHeader>RISKS & ROADBLOCKS</SectionHeader>
          <RisksTable risks={report.risks} />
        </div>

        {/* [3,1] Action Items table — right of Risks */}
        <div style={{ gridColumn: 3, gridRow: 1, overflow: 'hidden' }}>
          <SectionHeader>ACTION ITEMS</SectionHeader>
          <ActionItemsTable items={report.actionItems} />
        </div>

        {/* [4,1] Insights & Achievements — merged */}
        <div style={{ gridColumn: 4, gridRow: 1, overflow: 'hidden' }}>
          <SectionHeader>INSIGHTS & ACHIEVEMENTS</SectionHeader>
          <InsightsAndAchievements insights={report.insights} achievements={report.achievements} />
        </div>

        {/* [1-4,2] Timeline — full width */}
        <div style={{ gridColumn: '1 / -1', gridRow: 2, overflow: 'hidden' }}>
          <SectionHeader>PROJECT PROGRESS / TIMELINE</SectionHeader>
          <TimelineChart
            tasks={project.milestones}
            milestoneProgress={report.milestoneProgress ?? {}}
            projectStartDate={project.startDate}
            currentSprint={currentSprint}
            totalSprints={totalSprints}
            sprintLength={project.sprintLength ?? 1}
          />
        </div>
      </div>

    </div>
  )
}
