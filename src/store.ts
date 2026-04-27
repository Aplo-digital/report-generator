import { useReducer, useEffect } from 'react'
import type { Project, WeeklyReport } from './types'
import { getLatestReport, normalizeMilestoneProgress, normalizeShownMilestoneIds } from './utils'

interface State {
  projects: Project[]
}

type Action =
  | { type: 'UPSERT_PROJECT'; project: Project }
  | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'UPSERT_REPORT'; projectId: string; report: WeeklyReport }
  | { type: 'DELETE_REPORT'; projectId: string; reportId: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPSERT_PROJECT': {
      const exists = state.projects.some((p) => p.id === action.project.id)
      return {
        projects: exists
          ? state.projects.map((p) => (p.id === action.project.id ? action.project : p))
          : [...state.projects, action.project],
      }
    }
    case 'DELETE_PROJECT':
      return { projects: state.projects.filter((p) => p.id !== action.id) }
    case 'UPSERT_REPORT':
      return {
        projects: state.projects.map((p) => {
          if (p.id !== action.projectId) return p
          const exists = p.reports.some((r) => r.id === action.report.id)
          return {
            ...p,
            reports: exists
              ? p.reports.map((r) => (r.id === action.report.id ? action.report : r))
              : [...p.reports, action.report],
          }
        }),
      }
    case 'DELETE_REPORT':
      return {
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? { ...p, reports: p.reports.filter((r) => r.id !== action.reportId) }
            : p
        ),
      }
    default:
      return state
  }
}

const STORAGE_KEY = 'aplo-status-reporter'

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
    milestones,
    currentMilestoneProgress: normalizeMilestoneProgress(
      milestones,
      project.currentMilestoneProgress ?? latestReport?.milestoneProgress,
    ),
    reports,
  }
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as State
      return {
        projects: (parsed.projects ?? []).map((project) => normalizeProject(project)),
      }
    }
  } catch {
    // Ignore invalid persisted state and fall back to an empty project list.
  }
  return { projects: [] }
}

export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return {
    projects: state.projects,
    upsertProject: (project: Project) => dispatch({ type: 'UPSERT_PROJECT', project }),
    deleteProject: (id: string) => dispatch({ type: 'DELETE_PROJECT', id }),
    upsertReport: (projectId: string, report: WeeklyReport) =>
      dispatch({ type: 'UPSERT_REPORT', projectId, report }),
    deleteReport: (projectId: string, reportId: string) =>
      dispatch({ type: 'DELETE_REPORT', projectId, reportId }),
  }
}

export type Store = ReturnType<typeof useStore>
