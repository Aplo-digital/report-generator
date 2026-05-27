import { useState, useEffect, useCallback, useRef } from 'react'
import type { Achievement, ActionItem, Insight, MilestoneDef, Project, ProjectStatus, Risk, WeeklyReport } from './types'
import { getLatestReport, getReportDateISO, normalizeMilestoneProgress, normalizeShownMilestoneIds } from './utils'
import { supabase } from './supabase'

type PersistenceMode = 'normalized' | 'legacy'

interface LegacyProjectRow {
  data: Project
}

interface ProjectRow {
  id: string
  name: string | null
  description: string | null
  goal: string | null
  client_name: string | null
  client_logo: string | null
  start_date: string | null
  end_date: string | null
  sprint_length: Project['sprintLength'] | null
  current_milestone_progress: Record<string, number> | null
  timeline_window_start: number | null
  float_project_id: number | null
  updated_at: string | null
}

interface MilestoneRow {
  id: string
  project_id: string
  name: string | null
  start_week: number | null
  end_week: number | null
  sort_order: number | null
}

interface WeeklyReportRow {
  id: string
  project_id: string
  week_number: number | null
  report_date: string | null
  is_draft: boolean | null
  status: ProjectStatus | null
  confidence_level: number | null
  milestone_progress: Record<string, number> | null
  shown_milestone_ids: string[] | null
  insights: Insight[] | null
  achievements: Achievement[] | null
  risks: Risk[] | null
  action_items: ActionItem[] | null
}

function normalizeClientLogo(clientLogo: Project['clientLogo']): Project['clientLogo'] {
  if (!clientLogo) return null
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(clientLogo)) return clientLogo
  if (/^https?:\/\//.test(clientLogo)) return clientLogo
  return null
}

function normalizeProject(project: Project): Project {
  const milestones = project.milestones ?? []
  const rawReports = project.reports ?? []
  const shiftLegacyReportWeeks = rawReports.some((report) => (report.weekNumber ?? 0) === 0)
  const reports = rawReports.map((report) => {
    const weekNumber = (report.weekNumber ?? 0) + (shiftLegacyReportWeeks ? 1 : 0)

    return {
      ...report,
      weekNumber,
      reportDate: project.startDate ? getReportDateISO(project.startDate, weekNumber) : report.reportDate,
      milestoneProgress: normalizeMilestoneProgress(milestones, report.milestoneProgress),
      shownMilestoneIds: normalizeShownMilestoneIds(milestones, report.shownMilestoneIds),
      achievements: report.achievements ?? [],
    }
  })
  const latestReport = getLatestReport(reports)

  return {
    ...project,
    clientLogo: normalizeClientLogo(project.clientLogo),
    milestones,
    timelineWindowStart: Math.max(1, project.timelineWindowStart ?? 1),
    currentMilestoneProgress: normalizeMilestoneProgress(
      milestones,
      project.currentMilestoneProgress ?? latestReport?.milestoneProgress,
    ),
    reports,
  }
}

function projectFromRows(
  project: ProjectRow,
  milestones: MilestoneRow[],
  reports: WeeklyReportRow[],
): Project {
  const projectMilestones: MilestoneDef[] = milestones
    .filter((milestone) => milestone.project_id === project.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((milestone) => ({
      id: milestone.id,
      name: milestone.name ?? '',
      startWeek: milestone.start_week,
      endWeek: milestone.end_week,
    }))

  const projectReports: WeeklyReport[] = reports
    .filter((report) => report.project_id === project.id)
    .sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0))
    .map((report) => ({
      id: report.id,
      weekNumber: report.week_number ?? 0,
      reportDate: report.report_date ?? project.start_date ?? '',
      isDraft: report.is_draft ?? false,
      status: report.status ?? 'on-track',
      confidenceLevel: report.confidence_level ?? undefined,
      milestoneProgress: report.milestone_progress ?? {},
      shownMilestoneIds: report.shown_milestone_ids ?? [],
      insights: report.insights ?? [],
      achievements: report.achievements ?? [],
      risks: report.risks ?? [],
      actionItems: report.action_items ?? [],
    }))

  return normalizeProject({
    id: project.id,
    name: project.name ?? '',
    description: project.description ?? '',
    goal: project.goal ?? '',
    clientName: project.client_name ?? '',
    clientLogo: project.client_logo,
    startDate: project.start_date ?? '',
    endDate: project.end_date ?? '',
    sprintLength: project.sprint_length ?? 1,
    milestones: projectMilestones,
    currentMilestoneProgress: project.current_milestone_progress ?? {},
    timelineWindowStart: project.timeline_window_start ?? 1,
    reports: projectReports,
    floatProjectId: project.float_project_id,
  })
}

function projectToProjectRow(project: Project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    goal: project.goal,
    client_name: project.clientName,
    client_logo: normalizeClientLogo(project.clientLogo),
    start_date: project.startDate,
    end_date: project.endDate,
    sprint_length: project.sprintLength,
    current_milestone_progress: project.currentMilestoneProgress,
    timeline_window_start: project.timelineWindowStart,
    float_project_id: project.floatProjectId ?? null,
    updated_at: new Date().toISOString(),
  }
}

function projectToMilestoneRows(project: Project) {
  return project.milestones.map((milestone, index) => ({
    id: milestone.id,
    project_id: project.id,
    name: milestone.name,
    start_week: milestone.startWeek,
    end_week: milestone.endWeek,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }))
}

function reportToRow(projectId: string, report: WeeklyReport) {
  return {
    id: report.id,
    project_id: projectId,
    week_number: report.weekNumber,
    report_date: report.reportDate,
    is_draft: report.isDraft,
    status: report.status,
    confidence_level: report.confidenceLevel ?? null,
    milestone_progress: report.milestoneProgress,
    shown_milestone_ids: report.shownMilestoneIds,
    insights: report.insights,
    achievements: report.achievements ?? [],
    risks: report.risks,
    action_items: report.actionItems,
    updated_at: new Date().toISOString(),
  }
}

async function loadNormalizedProjects(): Promise<Project[]> {
  const { data: projectRows, error: projectError } = await supabase
    .from('projects')
    .select([
      'id',
      'name',
      'description',
      'goal',
      'client_name',
      'client_logo',
      'start_date',
      'end_date',
      'sprint_length',
      'current_milestone_progress',
      'timeline_window_start',
      'float_project_id',
      'updated_at',
    ].join(','))
    .order('updated_at', { ascending: false })

  if (projectError) throw projectError
  const projects = (projectRows ?? []) as unknown as ProjectRow[]
  const projectIds = projects.map((project) => project.id)
  if (projectIds.length === 0) return []

  const [{ data: milestoneRows, error: milestoneError }, { data: reportRows, error: reportError }] =
    await Promise.all([
      supabase
        .from('project_milestones')
        .select('id,project_id,name,start_week,end_week,sort_order')
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('weekly_reports')
        .select([
          'id',
          'project_id',
          'week_number',
          'report_date',
          'is_draft',
          'status',
          'confidence_level',
          'milestone_progress',
          'shown_milestone_ids',
          'insights',
          'achievements',
          'risks',
          'action_items',
        ].join(','))
        .in('project_id', projectIds)
        .order('week_number', { ascending: true }),
    ])

  if (milestoneError) throw milestoneError
  if (reportError) throw reportError

  return projects.map((project) =>
    projectFromRows(
      project,
      (milestoneRows ?? []) as unknown as MilestoneRow[],
      (reportRows ?? []) as unknown as WeeklyReportRow[],
    ),
  )
}

async function loadLegacyProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('data')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as LegacyProjectRow[]).map((row) => normalizeProject(row.data as Project))
}

async function dbUpsertProject(project: Project, mode: PersistenceMode): Promise<PersistenceMode> {
  if (mode === 'normalized') {
    const { error } = await supabase.from('projects').upsert(projectToProjectRow(project))
    if (error) {
      console.error('Supabase normalized project upsert error:', error)
      const { error: legacyError } = await supabase
        .from('projects')
        .upsert({ id: project.id, data: project, updated_at: new Date().toISOString() })
      if (legacyError) console.error('Supabase legacy project upsert error:', legacyError)
      return 'legacy'
    }

    const { error: deleteError } = await supabase
      .from('project_milestones')
      .delete()
      .eq('project_id', project.id)
    if (deleteError) {
      console.error('Supabase milestone replace error:', deleteError)
      return 'normalized'
    }

    const milestoneRows = projectToMilestoneRows(project)
    if (milestoneRows.length > 0) {
      const { error: insertError } = await supabase.from('project_milestones').insert(milestoneRows)
      if (insertError) console.error('Supabase milestone insert error:', insertError)
    }

    return 'normalized'
  }

  const { error } = await supabase
    .from('projects')
    .upsert({ id: project.id, data: project, updated_at: new Date().toISOString() })
  if (error) console.error('Supabase legacy project upsert error:', error)
  return 'legacy'
}

async function dbDeleteProject(id: string, mode: PersistenceMode): Promise<void> {
  if (mode === 'normalized') {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) console.error('Supabase normalized project delete error:', error)
    return
  }

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) console.error('Supabase legacy project delete error:', error)
}

async function dbUpsertReport(projectId: string, report: WeeklyReport, mode: PersistenceMode): Promise<PersistenceMode> {
  if (mode === 'normalized') {
    const { error } = await supabase.from('weekly_reports').upsert(reportToRow(projectId, report))
    if (error) {
      console.error('Supabase normalized report upsert error:', error)
      return 'legacy'
    }
    return 'normalized'
  }

  return 'legacy'
}

async function dbDeleteReport(projectId: string, reportId: string, mode: PersistenceMode): Promise<PersistenceMode> {
  if (mode === 'normalized') {
    const { error } = await supabase
      .from('weekly_reports')
      .delete()
      .eq('project_id', projectId)
      .eq('id', reportId)
    if (error) {
      console.error('Supabase normalized report delete error:', error)
      return 'legacy'
    }
    return 'normalized'
  }

  return 'legacy'
}

export function useStore(enabled = true) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const projectsRef = useRef<Project[]>([])
  const persistenceModeRef = useRef<PersistenceMode>('normalized')

  // Keep ref in sync so callbacks don't need projects in their dep array
  useEffect(() => { projectsRef.current = projects }, [projects])

  // Initial load from Supabase
  useEffect(() => {
    if (!enabled) {
      setProjects([])
      setIsLoading(false)
      return
    }

    const load = async () => {
      setIsLoading(true)
      try {
        const normalized = await loadNormalizedProjects()
        persistenceModeRef.current = 'normalized'
        setProjects(normalized)
      } catch (normalizedErr) {
        console.warn('Supabase normalized load unavailable, falling back to legacy JSON:', normalizedErr)
        try {
          const legacy = await loadLegacyProjects()
          persistenceModeRef.current = 'legacy'
          setProjects(legacy)
        } catch (legacyErr) {
          console.error('Supabase load error:', legacyErr)
        }
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [enabled])

  const upsertProject = useCallback((project: Project) => {
    const normalizedProject = normalizeProject(project)
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === normalizedProject.id)
      return exists
        ? prev.map((p) => (p.id === normalizedProject.id ? normalizedProject : p))
        : [...prev, normalizedProject]
    })
    void dbUpsertProject(normalizedProject, persistenceModeRef.current).then((mode) => {
      persistenceModeRef.current = mode
    })
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    void dbDeleteProject(id, persistenceModeRef.current)
  }, [])

  const upsertReport = useCallback((projectId: string, report: WeeklyReport) => {
    let updated: Project | null = null
    setProjects((prev) => prev.map((project) => {
      if (project.id !== projectId) return project

      const normalizedReport = {
        ...report,
        milestoneProgress: normalizeMilestoneProgress(project.milestones, report.milestoneProgress),
        shownMilestoneIds: normalizeShownMilestoneIds(project.milestones, report.shownMilestoneIds),
        achievements: report.achievements ?? [],
      }
      const exists = project.reports.some((item) => item.id === report.id)
      updated = normalizeProject({
        ...project,
        reports: exists
          ? project.reports.map((item) => (item.id === report.id ? normalizedReport : item))
          : [...project.reports, normalizedReport],
      })
      return updated
    }))

    const fallbackToLegacy = () => {
      const current = updated ?? projectsRef.current.find((p) => p.id === projectId)
      if (current) void dbUpsertProject(current, 'legacy')
    }

    void dbUpsertReport(projectId, report, persistenceModeRef.current).then((mode) => {
      persistenceModeRef.current = mode
      if (mode === 'legacy') fallbackToLegacy()
    })
  }, [])

  const deleteReport = useCallback((projectId: string, reportId: string) => {
    let updated: Project | null = null
    setProjects((prev) => prev.map((project) => {
      if (project.id !== projectId) return project
      updated = normalizeProject({
        ...project,
        reports: project.reports.filter((report) => report.id !== reportId),
      })
      return updated
    }))

    const fallbackToLegacy = () => {
      const current = updated ?? projectsRef.current.find((p) => p.id === projectId)
      if (current) void dbUpsertProject(current, 'legacy')
    }

    void dbDeleteReport(projectId, reportId, persistenceModeRef.current).then((mode) => {
      persistenceModeRef.current = mode
      if (mode === 'legacy') fallbackToLegacy()
    })
  }, [])

  return { projects, isLoading, upsertProject, deleteProject, upsertReport, deleteReport }
}

export type Store = ReturnType<typeof useStore>
