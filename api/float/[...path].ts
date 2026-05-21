import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.VITE_FLOAT_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Float API key not configured' })
    return
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path ?? ''
  const search = new URL(req.url ?? '/', `http://localhost`).search
  const upstream = `https://api.float.com/${path}${search}`

  const upstream_res = await fetch(upstream, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'project-timeline/1.0',
      'Content-Type': 'application/json',
    },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  })

  const data = await upstream_res.json()
  res.status(upstream_res.status).json(data)
}
