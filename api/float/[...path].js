export default async function handler(req, res) {
  const apiKey = process.env.VITE_FLOAT_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Float API key not configured' })
  }

  const pathSegments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
    ? [req.query.path]
    : []

  const search = new URL(req.url, 'http://localhost').search
  const upstream = `https://api.float.com/${pathSegments.join('/')}${search}`

  const upstream_res = await fetch(upstream, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'project-timeline/1.0',
      Accept: 'application/json',
    },
  })

  const data = await upstream_res.json()
  res.status(upstream_res.status).json(data)
}
