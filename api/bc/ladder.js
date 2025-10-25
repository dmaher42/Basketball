const API_BASE = 'https://api-basketball.squadi.com/livescores'
const LADDER_BASE_URL = 'https://registration.basketballconnect.com/livescorePublicLadder'

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

async function fetchWithStatus(url) {
  const response = await fetch(url)
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (error) {
      data = { message: text }
    }
  }
  return {
    data: data === null ? {} : data,
    status: response.status,
    ok: response.ok
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const params = buildSearchParams(req.query)
    const usePrimary = params.get('primary') === '1'
    const useFallback = params.get('fallback') === '1'
    if (usePrimary) {
      params.delete('primary')
    }
    if (useFallback) {
      params.delete('fallback')
    }

    const queryString = params.toString()
    const primaryUrl =
      queryString.length > 0
        ? `${LADDER_BASE_URL}?${queryString}`
        : LADDER_BASE_URL
    const fallbackUrl =
      queryString.length > 0
        ? `${API_BASE}/teams/ladder/v2?${queryString}`
        : `${API_BASE}/teams/ladder/v2`

    let result
    if (useFallback) {
      result = await fetchWithStatus(fallbackUrl)
    } else {
      result = await fetchWithStatus(primaryUrl)
      if (!result.ok) {
        result = await fetchWithStatus(fallbackUrl)
      }
    }

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
    res.status(result.status).json(result.data)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ladder', error: error.message })
  }
}
