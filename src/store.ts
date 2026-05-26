import { useState, useEffect, useCallback, useRef } from 'react'
import type { Project, WeeklyReport } from './types'
import { getLatestReport, normalizeMilestoneProgress, normalizeShownMilestoneIds } from './utils'
import { supabase } from './supabase'

function normalizeClientLogo(clientLogo: Project['clientLogo']): Project['clientLogo'] {
  if (!clientLogo) return null
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(clientLogo)) return clientLogo
  if (/^https?:\/\//.test(clientLogo)) return clientLogo
  return null
}

function normalizeProject(project: Project): Project {
  const milestones = project.milestones ?? []
  const reports = (project.reports ?? []).map((report) => ({
    ...report,
    milestoneProgress: normalizeMilestoneProgress(milestones, report.milestoneProgress),
    shownMilestoneIds: normalizeShownMilestoneIds(milestones, report.shownMilestoneIds),
  }))
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

function dbUpsertProject(project: Project): void {
  supabase
    .from('projects')
    .upsert({ id: project.id, data: project, updated_at: new Date().toISOString() })
    .then(({ error }) => { if (error) console.error('Supabase upsert error:', error) })
}

function dbDeleteProject(id: string): void {
  supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .then(({ error }) => { if (error) console.error('Supabase delete error:', error) })
}

export function useStore(enabled = true) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const projectsRef = useRef<Project[]>([])

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
        const { data, error } = await supabase
          .from('projects')
          .select('data')
          .order('updated_at', { ascending: false })
        if (error) console.error('Supabase load error:', error)
        if (data) setProjects(data.map((row) => normalizeProject(row.data as Project)))
      } catch (err) {
        console.error('Supabase connection error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [enabled])

  const upsertProject = useCallback((project: Project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id)
      return exists
        ? prev.map((p) => (p.id === project.id ? project : p))
        : [...prev, project]
    })
    dbUpsertProject(project)
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    dbDeleteProject(id)
  }, [])

  const upsertReport = useCallback((projectId: string, report: WeeklyReport) => {
    const current = projectsRef.current.find((p) => p.id === projectId)
    if (!current) return
    const exists = current.reports.some((r) => r.id === report.id)
    const reports = exists
      ? current.reports.map((r) => (r.id === report.id ? report : r))
      : [...current.reports, report]
    const updated = { ...current, reports }
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)))
    dbUpsertProject(updated)
  }, [])

  const deleteReport = useCallback((projectId: string, reportId: string) => {
    const current = projectsRef.current.find((p) => p.id === projectId)
    if (!current) return
    const updated = { ...current, reports: current.reports.filter((r) => r.id !== reportId) }
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)))
    dbUpsertProject(updated)
  }, [])

  return { projects, isLoading, upsertProject, deleteProject, upsertReport, deleteReport }
}

export type Store = ReturnType<typeof useStore>
