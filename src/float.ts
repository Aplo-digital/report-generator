// In dev, requests hit the Vite proxy (/api/float → https://api.float.com).
// In production, Vercel rewrites the same path to api/float.js.
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

async function floatGet<T>(path: string): Promise<T> {
  const res = await fetch(`${FLOAT_BASE}${path}`)
  const contentType = res.headers.get('content-type') ?? ''
  const body = await res.text()

  if (!res.ok) {
    throw new Error(`Float API ${res.status}: ${body || res.statusText}`)
  }

  if (!contentType.includes('application/json')) {
    throw new Error('Float API proxy returned a non-JSON response')
  }

  return JSON.parse(body) as T
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
