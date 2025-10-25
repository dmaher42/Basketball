const BASE_URL = 'https://registration.basketballconnect.com/liveScorePlayerStatistics'

function buildSearchParams(query = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') continue
    params.append(key, value)
  }
  return params
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'x-requested-with': 'XMLHttpRequest'
    }
  })
  const text = await response.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (error) {
      data = { message: text }
    }
  }
  return { response, data }
}

function pickFirst(obj, keys, fallback = null) {
  if (!obj || typeof obj !== 'object') {
    return fallback
  }
  for (const key of keys) {
    if (key in obj && obj[key] != null && obj[key] !== '') {
      return obj[key]
    }
  }
  return fallback
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]+/g, ''))
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

function normalizePlayers(rawData) {
  const candidates = [
    rawData?.players,
    rawData?.playerStatistics,
    rawData?.playerStats,
    rawData?.statistics,
    rawData?.data?.players,
    rawData?.data?.playerStatistics,
    Array.isArray(rawData) ? rawData : null
  ]
  const list = candidates.find((candidate) => Array.isArray(candidate)) || []

  return list
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const playerName = pickFirst(item, ['playerName', 'name', 'player', 'participantName'], 'Unknown')
      const teamName = pickFirst(item, ['teamName', 'team', 'teamDisplayName'], 'Unknown')
      const games = pickFirst(item, ['gamesPlayed', 'games', 'played', 'matchesPlayed'])
      const totalPoints = pickFirst(item, ['totalPoints', 'points', 'pointsScored', 'pointsTotal'])
      const avgPoints = pickFirst(item, ['averagePoints', 'avgPoints', 'pointsAverage', 'avg'])

      const gamesNumber = toNumber(games)
      const totalPointsNumber = toNumber(totalPoints) || 0
      const avgPointsNumber = toNumber(avgPoints)

      return {
        playerName,
        teamName,
        games: gamesNumber,
        totalPoints: totalPointsNumber,
        avgPoints: avgPointsNumber
      }
    })
    .filter((player) => player && player.playerName)
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  }

  try {
    const { organisationKey, yearId, competitionUniqueKey, competitionId, divisionId } = req.query

    if (!organisationKey || !yearId || !competitionUniqueKey || !divisionId) {
      return res.status(400).json({ ok: false, error: 'Missing required parameters' })
    }

    const params = buildSearchParams({
      organisationKey,
      yearId,
      competitionUniqueKey,
      competitionId,
      divisionId
    })

    const url = `${BASE_URL}?${params.toString()}`
    const { response, data } = await fetchJson(url)

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ ok: false, error: data?.message || `Request failed with status ${response.status}` })
    }

    const players = normalizePlayers(data)

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, players })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Unknown error' })
  }
}
