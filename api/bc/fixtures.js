const API_BASE = 'https://api-basketball.squadi.com/livescores'

function buildSearchParams(query = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) {
          params.append(key, item)
        }
      }
    } else {
      params.append(key, value)
    }
  }
  return params
}

async function forwardRequest(res, targetUrl) {
  try {
    const response = await fetch(targetUrl)
    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch (error) {
        data = { message: text }
      }
    }
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
    if (data === null) {
      res.status(response.status).json({})
    } else {
      res.status(response.status).json(data)
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fixtures', error: error.message })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const params = buildSearchParams(req.query)
  const queryString = params.toString()
  const targetUrl =
    queryString.length > 0
      ? `${API_BASE}/round/matches?${queryString}`
      : `${API_BASE}/round/matches`

  await forwardRequest(res, targetUrl)
}
