export type ProjectStatus = 'on-track' | 'at-risk' | 'delayed'

export interface MilestoneDef {
  id: string
  name: string
  startWeek: number
  endWeek: number
}

export interface Milestone {
  id: string
  name: string
  progress: number // 0–100
}

export interface Insight {
  id: string
  text: string
}

export interface Achievement {
  id: string
  text: string
}

export interface Risk {
  id: string
  risk: string
  mitigation: string
}

export interface ActionItem {
  id: string
  text: string
  responsible: string
  completed: boolean
}

export interface WeeklyReport {
  id: string
  weekNumber: number
  reportDate: string
  isDraft: boolean
  status: ProjectStatus
  confidenceLevel?: number // 1–5
  milestoneProgress: Record<string, number>
  shownMilestoneIds: string[]
  insights: Insight[]
  achievements: Achievement[]
  risks: Risk[]
  actionItems: ActionItem[]
}

export type SprintLength = 1 | 2 | 3 | 4

export interface Project {
  id: string
  name: string
  description: string
  goal: string
  clientName: string
  clientLogo: string | null
  startDate: string
  endDate: string
  sprintLength: SprintLength
  milestones: MilestoneDef[]
  currentMilestoneProgress: Record<string, number>
  timelineWindowStart: number
  reports: WeeklyReport[]
}

export type NavView =
  | { name: 'projects' }
  | { name: 'project'; projectId: string }
  | { name: 'report'; projectId: string; reportId: string }
