import type { CSSProperties } from 'react'
import type { Project, WeeklyReport } from '../types'
import {
  formatSlideDate,
  formatWeekDate,
  getProjectWeekCount,
  getWeekStartDate,
  MAX_REPORT_MILESTONES,
  normalizeShownMilestoneIds,
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
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1.5px',
        color: '#9ca3af',
        textTransform: 'uppercase',
        marginBottom: '10px',
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <SectionLabel>{children}</SectionLabel>
      <div style={{ height: '1px', background: '#e5e7eb' }} />
    </div>
  )
}

// ─── Milestones ───────────────────────────────────────────────────────────────

function MilestoneRow({ name, progress }: { name: string; progress: number }) {
  const done = progress === 100
  const color = done ? '#16a34a' : '#1f2937'

  return (
    <div
      style={{
        paddingBottom: '10px',
        marginBottom: '10px',
      }}
    >
      <div style={{ fontSize: '14px', color: '#1f2937', marginBottom: '6px' }}>{name}</div>
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

function AchievementsList({ achievements }: { achievements: WeeklyReport['achievements'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {achievements.map((achievement) => (
        <div
          key={achievement.id}
          style={{
            display: 'flex',
            gap: '10px',
            paddingBottom: '10px',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              background: '#16a34a',
              marginTop: '6px',
              flexShrink: 0,
            }}
          />
          <div style={{ fontSize: '13px', lineHeight: '1.55', color: '#374151' }}>{achievement.text}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Action items ─────────────────────────────────────────────────────────────

function ActionRow({ item }: { item: WeeklyReport['actionItems'][number] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        paddingBottom: '12px',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <div
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: item.completed ? '#16a34a' : 'transparent',
          border: `1.5px solid ${item.completed ? '#16a34a' : '#9ca3af'}`,
          marginTop: '4px',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          flex: 1,
          fontSize: '13px',
          lineHeight: '1.5',
          color: item.completed ? '#9ca3af' : '#1f2937',
          textDecoration: item.completed ? 'line-through' : 'none',
        }}
      >
        {item.text}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#6b7280',
          fontWeight: 500,
          flexShrink: 0,
          minWidth: '70px',
          textAlign: 'right',
        }}
      >
        {item.responsible}
      </div>
    </div>
  )
}

// ─── Gantt timeline ───────────────────────────────────────────────────────────

const NAME_W = 180
const WEEK_W = 200

function getTimelineWindowStart(currentSprint: number, totalSprints: number): number {
  if (totalSprints <= TIMELINE_BLOCK_COUNT) return 0
  return Math.max(0, Math.min(currentSprint - 2, totalSprints - TIMELINE_BLOCK_COUNT))
}

function milestoneBarColor(progress: number): string {
  if (progress === 0) return '#e5e7eb'
  if (progress === 100) return '#16a34a'
  if (progress < 34) return '#d1d5db'
  if (progress < 67) return '#9ca3af'
  return '#4b5563'
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

  return (
    <div style={{ position: 'relative', fontSize: '12px' }}>
      {/* "We are here" pill */}
      {currentIdx >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: `${NAME_W + currentIdx * WEEK_W + 10}px`,
            top: '6px',
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

      {/* Block header row */}
      <div style={{ display: 'flex', marginTop: '26px' }}>
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
            <div style={{ fontWeight: 700, fontSize: '18px' }}>{blockNum}</div>
            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
              {formatWeekDate(date)}
            </div>
          </div>
        ))}
      </div>

      {/* Task rows */}
      {tasks.map((task) => {
        const startWeek = task.startWeek ?? 0
        const endWeek = task.endWeek ?? 1
        const windowEnd = windowStart + blocks.length - 1
        const isVisibleInWindow = !(endWeek < windowStart || startWeek > windowEnd)

        const barStartIdx = Math.max(0, startWeek - windowStart)
        const barEndIdx = Math.min(blocks.length - 1, endWeek - windowStart)
        const barSpan = barEndIdx - barStartIdx + 1

        return (
          <div
            key={task.id}
            style={{ display: 'flex', height: '36px', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}
          >
            <div
              style={{
                width: `${NAME_W}px`,
                flexShrink: 0,
                fontSize: '13px',
                color: '#374151',
                paddingRight: '12px',
              }}
            >
              {task.name}
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
                    background: milestoneBarColor(milestoneProgress[task.id] ?? 0),
                    borderRadius: '3px',
                  }}
                />
              )}
            </div>
          </div>
        )
      })}

      <div
        style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#9ca3af',
          textAlign: 'right',
          width: `${NAME_W + blocks.length * WEEK_W}px`,
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
  const visibleMilestoneIds = normalizeShownMilestoneIds(project.milestones, report.shownMilestoneIds)
  const visibleMilestones = project.milestones.filter((milestone) => visibleMilestoneIds.includes(milestone.id)).slice(0, MAX_REPORT_MILESTONES)
  const hiddenMilestoneCount = Math.max(0, project.milestones.length - visibleMilestones.length)
  const projectWeekCount = getProjectWeekCount(project.startDate, project.endDate)
  const totalSprints = Math.max(1, Math.ceil(projectWeekCount / (project.sprintLength ?? 1)))
  const currentSprint = Math.max(0, Math.min(
    Math.floor(report.weekNumber / (project.sprintLength ?? 1)),
    totalSprints - 1,
  ))

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontSize: '12px',
                letterSpacing: '2px',
                color: '#9ca3af',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              STATUS REPORT // {formatSlideDate(report.reportDate)} // WEEK {report.weekNumber}
            </div>
            <h1
              style={{
                fontSize: '36px',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-1.5px',
                lineHeight: 1.1,
                color: '#111827',
              }}
            >
              {project.name}
            </h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {report.confidenceLevel != null && (
                <span
                  style={{
                    background: '#1e293b',
                    color: 'white',
                    padding: '10px 20px',
                    fontSize: '12px',
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
                  padding: '10px 20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  borderRadius: '6px',

                }}
              >
                {statusConfig.label}
              </span>
            </div>
            {project.clientLogo && (
              <img
                src={project.clientLogo}
                alt={project.clientName}
                style={{ height: '68px', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
        <div style={{ height: '1px', background: '#e5e7eb', marginTop: '20px' }} />
      </div>

      {/* ── Content grid: 3 cols × 2 rows ── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '320px 1fr 1fr 360px',
          gridTemplateRows: '1fr 1fr',
          columnGap: '48px',
          rowGap: '24px',
          overflow: 'hidden',
        }}
      >
        {/* [1,1] Overall Project Status */}
        <div style={{ gridColumn: 1, gridRow: 1, overflow: 'hidden' }}>
          <SectionHeader>OVERALL PROJECT STATUS</SectionHeader>
          {visibleMilestones.map((ms) => (
            <MilestoneRow key={ms.id} name={ms.name} progress={report.milestoneProgress?.[ms.id] ?? 0} />
          ))}
          {hiddenMilestoneCount > 0 && (
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
              +{hiddenMilestoneCount} more
            </div>
          )}
        </div>

        {/* [2,1] Risks & Roadblocks */}
        <div style={{ gridColumn: 2, gridRow: 1, overflow: 'hidden' }}>
          <SectionHeader>RISKS & ROADBLOCKS</SectionHeader>
          <RisksTable risks={report.risks} />
        </div>

        {/* [3,1] Achievements */}
        <div style={{ gridColumn: 3, gridRow: 1, overflow: 'hidden' }}>
          <SectionHeader>ACHIEVEMENTS</SectionHeader>
          <AchievementsList achievements={report.achievements} />
        </div>

        {/* [4,1] Action Items */}
        <div style={{ gridColumn: 4, gridRow: 1, overflow: 'hidden' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#9ca3af', textTransform: 'uppercase' }}>
                ACTION ITEMS
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#9ca3af', textTransform: 'uppercase' }}>
                RESPONSIBLE
              </div>
            </div>
            <div style={{ height: '1px', background: '#e5e7eb' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {report.actionItems.map((item) => (
              <ActionRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* [1,2] Insights */}
        <div style={{ gridColumn: 1, gridRow: 2, overflow: 'hidden' }}>
          <SectionHeader>INSIGHTS</SectionHeader>
          <ul
            style={{
              margin: 0,
              paddingLeft: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              listStyleType: 'disc',
              listStylePosition: 'outside',
            }}
          >
            {report.insights.map((ins) => (
              <li
                key={ins.id}
                style={{
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#374151',
                  paddingLeft: '2px',
                  display: 'list-item',
                }}
              >
                {ins.text}
              </li>
            ))}
          </ul>
        </div>

        {/* [2-4,2] Timeline */}
        <div style={{ gridColumn: '2 / span 3', gridRow: 2, overflow: 'hidden' }}>
          <SectionHeader>PROJECT PROGRESS / TIMELINE</SectionHeader>
          <TimelineChart
            tasks={visibleMilestones}
            milestoneProgress={report.milestoneProgress ?? {}}
            projectStartDate={project.startDate}
            currentSprint={currentSprint}
            totalSprints={totalSprints}
            sprintLength={project.sprintLength ?? 1}
          />
        </div>
      </div>

      {/* ── Footer branding ── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingTop: '10px',
          marginTop: '8px',
          borderTop: '1px solid #f3f4f6',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '13px', color: '#6b7280', letterSpacing: '1px' }}>
          aplo
        </span>
        <span style={{ fontSize: '18px', color: '#aa3bff', marginLeft: '3px', letterSpacing: '2px' }}>
          •••
        </span>
      </div>
    </div>
  )
}
