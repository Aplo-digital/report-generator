export default async function handler(req, res) {
  const apiKey = process.env.FLOAT_API_KEY ?? process.env.VITE_FLOAT_API_KEY
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

  const upstreamRes = await fetch(upstream, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'project-timeline/1.0',
      Accept: 'application/json',
    },
  })

  const contentType = upstreamRes.headers.get('content-type') ?? ''
  const body = await upstreamRes.text()

  res.status(upstreamRes.status)

  if (contentType.includes('application/json')) {
    res.setHeader('Content-Type', contentType)
    return res.send(body)
  }

  return res.json({
    error: 'Float returned a non-JSON response',
    status: upstreamRes.status,
  })
}
