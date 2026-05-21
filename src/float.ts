// Requests are routed through the Vite dev server proxy (/float-api → https://api.float.com)
// to avoid browser CORS restrictions. See vite.config.ts server.proxy.
const FLOAT_BASE = '/float-api/v3'

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
  const key = import.meta.env.VITE_FLOAT_API_KEY as string
  if (!key) throw new Error('Float API key not configured. Add VITE_FLOAT_API_KEY to your .env file.')
  const res = await fetch(`${FLOAT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
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
