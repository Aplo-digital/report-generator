export default async function handler(req, res) {
  const apiKey = process.env.FLOAT_API_KEY ?? process.env.VITE_FLOAT_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Float API key not configured' })
  }

  const path = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path
  if (!path) {
    return res.status(400).json({ error: 'Float API path not provided' })
  }

  const url = new URL(req.url, 'http://localhost')
  url.searchParams.delete('path')
  const search = url.searchParams.size ? `?${url.searchParams.toString()}` : ''
  const upstream = `https://api.float.com/${path}${search}`

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
