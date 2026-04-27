import type { MilestoneDef, WeeklyReport } from './types'

export const MAX_REPORT_MILESTONES = 6
export const TIMELINE_BLOCK_COUNT = 6

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function getProjectWeekCount(projectStartDate: string, projectEndDate: string): number {
  const start = new Date(projectStartDate)
  const end = new Date(projectEndDate)
  const diffDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
  return Math.floor(diffDays / 7) + 1
}

export function getCurrentWeek(projectStartDate: string): number {
  const start = new Date(projectStartDate)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

export function getWeekDateISO(projectStartDate: string, weekOffset: number): string {
  return addDaysISO(projectStartDate, weekOffset * 7)
}

export function getWeekStartDate(projectStartDate: string, weekOffset: number): Date {
  const d = new Date(projectStartDate)
  d.setDate(d.getDate() + weekOffset * 7)
  return d
}

export function formatWeekDate(date: Date): string {
  return date
    .toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    .toUpperCase()
}

export function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatSlideDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase()
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function normalizeMilestoneProgress(
  milestones: MilestoneDef[],
  progress: Record<string, number> | null | undefined,
): Record<string, number> {
  return Object.fromEntries(
    milestones.map((milestone) => [milestone.id, progress?.[milestone.id] ?? 0]),
  )
}

export function normalizeShownMilestoneIds(
  milestones: MilestoneDef[],
  shownMilestoneIds: string[] | null | undefined,
): string[] {
  const milestoneIds = new Set(milestones.map((milestone) => milestone.id))
  const normalized = (shownMilestoneIds ?? []).filter((id, index, ids) => (
    milestoneIds.has(id) && ids.indexOf(id) === index
  ))

  if (shownMilestoneIds != null) return normalized.slice(0, MAX_REPORT_MILESTONES)

  return milestones.slice(0, MAX_REPORT_MILESTONES).map((milestone) => milestone.id)
}

export function getDefaultShownMilestoneIds(
  milestones: MilestoneDef[],
  reportWeekNumber: number,
  sprintLength: number,
): string[] {
  const currentSprint = Math.floor(reportWeekNumber / sprintLength)
  const windowStart = Math.max(0, currentSprint - 2)
  const windowEnd = currentSprint + 3
  const overlappingMilestones = milestones.filter((milestone) => {
    const start = milestone.startWeek ?? 0
    const end = milestone.endWeek ?? start
    return start <= windowEnd && end >= windowStart
  })

  if (overlappingMilestones.length > 0) {
    return overlappingMilestones.slice(0, MAX_REPORT_MILESTONES).map((milestone) => milestone.id)
  }

  return milestones.slice(0, MAX_REPORT_MILESTONES).map((milestone) => milestone.id)
}

export function getLatestReport(reports: WeeklyReport[]): WeeklyReport | null {
  return reports.reduce<WeeklyReport | null>(
    (latest, report) => (!latest || report.weekNumber > latest.weekNumber ? report : latest),
    null,
  )
}
