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

async function fetchJson(url) {
  const res = await fetch(url)
  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (error) {
      data = { message: text }
    }
  }
  return { ok: res.ok, status: res.status, data }
}

function normalizeLadderRows(ladderData) {
  const ladderCandidates = [
    ladderData?.ladder,
    ladderData?.ladderData?.ladder,
    ladderData?.data?.ladder,
    ladderData?.ladders,
    ladderData?.rows,
    Array.isArray(ladderData) ? ladderData : null
  ]

  const ladderRows = ladderCandidates.find((candidate) => Array.isArray(candidate)) || []

  return ladderRows.map((team) => ({
    id: team.id ?? team.teamId ?? team.teamUniqueKey ?? team.team?.id ?? team.teamName,
    name: team.name ?? team.teamName ?? team.team?.name,
    rank: team.rk ?? team.rank ?? team.position
  }))
}

function normalizeFixtures(fixturesData) {
  const rounds = Array.isArray(fixturesData?.rounds) ? fixturesData.rounds : []
  return rounds.flatMap((round) =>
    (round.matches || []).map((match) => ({
      ...match,
      startTime: match.startTime || match.originalStartTime || null,
      team1Score: typeof match.team1Score === 'number' ? match.team1Score : null,
      team2Score: typeof match.team2Score === 'number' ? match.team2Score : null
    }))
  )
}

function computeLeaders(ladderRows, matches) {
  const sorted = [...ladderRows]
    .filter((team) => team.name)
    .sort((a, b) => (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY))
    .slice(0, 3)
    .map(({ id, name, rank }) => ({ id, name, rank }))

  if (sorted.length > 0) {
    return sorted
  }

  const fallbackTeams = ladderRows.filter((team) => team.name).slice(0, 3)
  if (fallbackTeams.length > 0) {
    return fallbackTeams.map(({ id, name }) => ({ id, name, rank: null }))
  }

  const seen = new Set()
  const names = []
  for (const match of matches) {
    const teamNames = [match.team1?.name, match.team2?.name]
    for (const name of teamNames) {
      if (!name || seen.has(name)) continue
      seen.add(name)
      names.push(name)
      if (names.length === 3) break
    }
    if (names.length === 3) break
  }

  return names.map((name) => ({ id: name, name, rank: null }))
}

function computeSummary(ladderRows, matches) {
  const now = Date.now()
  let completed = 0
  let upcoming = 0
  let totalPoints = 0
  let gamesWithPoints = 0

  for (const match of matches) {
    const hasScores = match.team1Score != null && match.team2Score != null
    const startTime = match.startTime ? Date.parse(match.startTime) : NaN
    if (hasScores) {
      completed += 1
      totalPoints += match.team1Score + match.team2Score
      gamesWithPoints += 1
    } else if (!Number.isNaN(startTime) && startTime > now) {
      upcoming += 1
    }
  }

  const leaders = computeLeaders(ladderRows, matches)

  return {
    lastUpdated: new Date().toISOString(),
    totals: {
      gamesUpcoming: upcoming,
      gamesCompleted: completed
    },
    leaders,
    pointsAvg: gamesWithPoints > 0 ? +(totalPoints / gamesWithPoints).toFixed(2) : null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const { organisationKey, yearId, competitionUniqueKey, divisionId, competitionId, teamIds = '' } = req.query

    if (!organisationKey || !yearId || !competitionUniqueKey || !divisionId) {
      return res.status(400).json({ ok: false, message: 'Missing required parameters' })
    }

    const ladderParams = buildSearchParams({
      organisationKey,
      yearId,
      includeRecentMatchData: 'true',
      competitionUniqueKey,
      divisionId
    })
    const ladderPrimaryUrl = `${LADDER_BASE_URL}?${ladderParams.toString()}`
    const ladderFallbackParams = buildSearchParams({
      divisionIds: divisionId,
      competitionKey: competitionUniqueKey
    })
    const ladderFallbackUrl = `${API_BASE}/teams/ladder/v2?${ladderFallbackParams.toString()}`

    const fixtureParams = buildSearchParams({
      competitionId,
      divisionId,
      ignoreStatuses: JSON.stringify([1]),
      teamIds
    })
    const fixturesUrl = `${API_BASE}/round/matches?${fixtureParams.toString()}`

    let ladder = await fetchJson(ladderPrimaryUrl)
    if (!ladder.ok) {
      ladder = await fetchJson(ladderFallbackUrl)
    }

    const fixtures = await fetchJson(fixturesUrl)

    if (!ladder.ok) {
      return res.status(ladder.status || 502).json({ ok: false, message: 'Failed to fetch ladder data' })
    }

    if (!fixtures.ok) {
      return res
        .status(fixtures.status || 502)
        .json({ ok: false, message: 'Failed to fetch fixtures data' })
    }

    const ladderRows = normalizeLadderRows(ladder.data)
    const matches = normalizeFixtures(fixtures.data)
    const payload = computeSummary(ladderRows, matches)

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, ...payload })
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, message: 'Failed to compute stats', error: error?.message || 'Unknown error' })
  }
}
