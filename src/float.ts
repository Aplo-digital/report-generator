// In dev, requests hit the Vite proxy (/api/float → https://api.float.com).
// In production, the same path is handled by api/float/[...path].ts (Vercel serverless).
const FLOAT_BASE = '/api/float/v3'

export interface FloatProject {
  project_id: number
  name: string
  client_id: number | null
  description: string | null
  notes: string | null
  start_date: string | null
  end_date: string | null
  active: 0 | 1
}

export interface FloatClient {
  client_id: number
  name: string
}

export function isFloatConfigured(): boolean {
  return !!(import.meta.env.VITE_FLOAT_API_KEY as string)
}

async function floatGet<T>(path: string): Promise<T> {
  const res = await fetch(`${FLOAT_BASE}${path}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Float API ${res.status}: ${body || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function fetchFloatProjects(): Promise<FloatProject[]> {
  return floatGet<FloatProject[]>('/projects?per-page=200')
}

export async function fetchFloatClients(): Promise<FloatClient[]> {
  return floatGet<FloatClient[]>('/clients?per-page=200')
}

export async function fetchFloatProject(id: number): Promise<FloatProject> {
  return floatGet<FloatProject>(`/projects/${id}`)
}
