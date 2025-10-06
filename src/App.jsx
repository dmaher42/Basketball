import React, { useEffect, useMemo, useState } from 'react'

const MATCHES_URL = 'https://api-basketball.squadi.com/livescores/round/matches?competitionId=1944&divisionId=16238&teamIds=&ignoreStatuses=%5B1%5D'
const LADDER_URL = 'https://registration.basketballconnect.com/livescorePublicLadder?organisationKey=3416293c-d99b-47de-8866-74a6138f0740&yearId=8&includeRecentMatchData=true&competitionUniqueKey=9c187248-330d-4a95-8c4e-903bf4c4a3cf&divisionId=16241'

const TABS = [
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'ladder', label: 'Ladder' },
  { id: 'player-stats', label: 'Player stats' }
]

const ladderFieldFallbacks = {
  teamId: ['teamId', 'teamID', 'team_id', ['team', 'id'], ['team', 'teamId']],
  teamName: ['teamName', 'team_name', ['team', 'name'], ['team', 'teamName'], 'name'],
  played: ['played', 'gamesPlayed', 'games', 'gp', 'matchesPlayed'],
  wins: ['wins', 'win', 'w'],
  losses: ['losses', 'loss', 'l'],
  draws: ['draws', 'draw', 'd'],
  points: ['points', 'competitionPoints', 'pts', 'competitionpoints'],
  percentage: ['percentage', 'pct', 'winPercentage', 'winPct'],
  forPoints: ['for', 'pointsFor', 'points_for', 'pointsScored'],
  againstPoints: ['against', 'pointsAgainst', 'points_against', 'pointsConceded']
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : value
}

function getNestedValue(source, path) {
  if (!source) return undefined
  if (typeof path === 'string') {
    return source[path]
  }
  return path.reduce((acc, key) => (acc == null ? undefined : acc[key]), source)
}

function pickFirstAvailable(source, candidates) {
  if (!source) return undefined
  for (const candidate of candidates) {
    const value = getNestedValue(source, candidate)
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

function normaliseLadderEntry(entry) {
  const rawTeamId = pickFirstAvailable(entry, ladderFieldFallbacks.teamId)

  const normalised = {
    teamId: rawTeamId == null ? undefined : String(rawTeamId),
    teamName: pickFirstAvailable(entry, ladderFieldFallbacks.teamName) ?? 'Unknown team',
    played: toNumber(pickFirstAvailable(entry, ladderFieldFallbacks.played)),
    wins: toNumber(pickFirstAvailable(entry, ladderFieldFallbacks.wins)),
    losses: toNumber(pickFirstAvailable(entry, ladderFieldFallbacks.losses)),
    draws: toNumber(pickFirstAvailable(entry, ladderFieldFallbacks.draws)),
    points: toNumber(pickFirstAvailable(entry, ladderFieldFallbacks.points)),
    percentage: pickFirstAvailable(entry, ladderFieldFallbacks.percentage),
    forPoints: toNumber(pickFirstAvailable(entry, ladderFieldFallbacks.forPoints)),
    againstPoints: toNumber(pickFirstAvailable(entry, ladderFieldFallbacks.againstPoints))
  }

  return normalised
}

function extractLadderArray(raw) {
  if (!raw || typeof raw !== 'object') return []

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object') {
        const nested = extractLadderArray(item)
        if (nested.length) return nested
      }
    }
    return raw
  }

  const possibleKeys = [
    'ladder',
    'ladderList',
    'ladderListData',
    'ladders',
    'data',
    'result',
    'results',
    'divisionLadder',
    'divisionList'
  ]

  for (const key of possibleKeys) {
    const value = raw[key]
    if (Array.isArray(value)) {
      return value
    }
    if (value && typeof value === 'object') {
      const nested = extractLadderArray(value)
      if (nested.length) return nested
    }
  }

  return []
}

async function parseLadderResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error('Unexpected ladder response format')
  }
}

function formatDateTime(isoString) {
  if (!isoString) {
    return { date: 'Date TBA', time: 'Time TBA' }
  }
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return { date: 'Date TBA', time: 'Time TBA' }
  }
  return {
    date: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
}

function MatchCard({ match }) {
  const { date, time } = formatDateTime(match.startTime || match.originalStartTime)
  const score1 = typeof match.team1Score === 'number' ? match.team1Score : '–'
  const score2 = typeof match.team2Score === 'number' ? match.team2Score : '–'
  return (
    <li className="card" style={{ marginBottom: 12, padding: 16, listStyle: 'none' }}>
      <div className="small muted" style={{ marginBottom: 4 }}>
        {match.round?.name ? `${match.round.name} · ` : ''}{date} · {time}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="title" style={{ marginBottom: 4 }}>{match.team1?.name ?? 'TBD'}</div>
          <div className="title">{match.team2?.name ?? 'TBD'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="title" style={{ fontWeight: 700 }}>{score1} – {score2}</div>
          {match.resultStatus && <div className="small muted" style={{ marginTop: 4 }}>{match.resultStatus}</div>}
        </div>
      </div>
      {match.venueCourt?.venue?.name && (
        <div className="small muted" style={{ marginTop: 8 }}>
          {match.venueCourt.venue.name}{match.venueCourt.name ? ` · ${match.venueCourt.name}` : ''}
        </div>
      )}
    </li>
  )
}

export default function App() {
  const [matches, setMatches] = useState([])
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [matchesError, setMatchesError] = useState(null)
  const [ladderEntries, setLadderEntries] = useState([])
  const [ladderLoading, setLadderLoading] = useState(true)
  const [ladderError, setLadderError] = useState(null)
  const [activeTab, setActiveTab] = useState('fixtures')
  const [selectedTeamId, setSelectedTeamId] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function fetchMatches() {
      setMatchesLoading(true)
      setMatchesError(null)
      try {
        const response = await fetch(MATCHES_URL)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = await response.json()
        const allMatches = (data.rounds || []).flatMap(round =>
          (round.matches || []).map(match => ({
            ...match,
            round: match.round || { name: round.name }
          }))
        )
        if (isMounted) {
          setMatches(allMatches)
        }
      } catch (err) {
        if (isMounted) {
          setMatchesError(err.message || 'Failed to load matches')
        }
      } finally {
        if (isMounted) {
          setMatchesLoading(false)
        }
      }
    }

    fetchMatches()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchLadder() {
      setLadderLoading(true)
      setLadderError(null)
      try {
        const response = await fetch(LADDER_URL)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const raw = await parseLadderResponse(response)
        const ladderArray = extractLadderArray(raw)
        const parsed = ladderArray.map(normaliseLadderEntry).filter(entry => entry.teamName)
        if (!parsed.length) {
          throw new Error('No ladder data available')
        }
        if (isMounted) {
          setLadderEntries(parsed)
        }
      } catch (err) {
        if (isMounted) {
          setLadderError(err.message || 'Failed to load ladder')
        }
      } finally {
        if (isMounted) {
          setLadderLoading(false)
        }
      }
    }

    fetchLadder()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredMatches = useMemo(() => {
    if (!selectedTeamId) return matches
    return matches.filter(match => String(match.team1?.id) === selectedTeamId || String(match.team2?.id) === selectedTeamId)
  }, [matches, selectedTeamId])

  const selectedTeamName = useMemo(() => {
    if (!selectedTeamId) return null
    const fromMatches = matches.find(match => String(match.team1?.id) === selectedTeamId || String(match.team2?.id) === selectedTeamId)
    if (fromMatches) {
      return String(fromMatches.team1?.id) === selectedTeamId ? fromMatches.team1?.name : fromMatches.team2?.name
    }
    const fromLadder = ladderEntries.find(entry => entry.teamId === selectedTeamId)
    return fromLadder?.teamName ?? null
  }, [ladderEntries, matches, selectedTeamId])

  return (
    <div className="container" style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Live Scores</h1>
        <p className="small muted">Latest results from competition 1944 · division 16238</p>
      </header>

      <nav className="tabs" style={{ marginBottom: 24 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="btn"
            style={{
              borderRadius: 16,
              padding: '8px 16px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              backgroundColor: activeTab === tab.id ? '#111' : '#fff',
              color: activeTab === tab.id ? '#fff' : '#111',
              borderColor: activeTab === tab.id ? '#111' : '#d4d4d4'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'fixtures' && (
        <section>
          {matchesLoading && <p>Loading matches…</p>}
          {matchesError && (
            <div className="card" style={{ padding: 16, marginBottom: 16, color: '#d00', background: '#fee', border: '1px solid #f99' }}>
              <strong>Error:</strong> {matchesError}
            </div>
          )}

          {!matchesLoading && !matchesError && filteredMatches.length === 0 && (
            <p>
              {selectedTeamId
                ? 'No fixtures found for the selected team.'
                : 'No matches available.'}
            </p>
          )}

          {!matchesLoading && !matchesError && filteredMatches.length > 0 && (
            <>
              {selectedTeamId && selectedTeamName && (
                <div className="small muted" style={{ marginBottom: 12 }}>
                  Showing fixtures for <strong>{selectedTeamName}</strong>.
                  {' '}
                  <button
                    type="button"
                    className="btn"
                    style={{ marginLeft: 8, padding: '4px 10px' }}
                    onClick={() => setSelectedTeamId(null)}
                  >
                    Clear
                  </button>
                </div>
              )}
              <ul style={{ padding: 0, margin: 0 }}>
                {filteredMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {activeTab === 'ladder' && (
        <section>
          {ladderLoading && <p>Loading ladder…</p>}
          {ladderError && (
            <div className="card" style={{ padding: 16, marginBottom: 16, color: '#d00', background: '#fee', border: '1px solid #f99' }}>
              <strong>Error:</strong> {ladderError}
            </div>
          )}

          {!ladderLoading && !ladderError && ladderEntries.length === 0 && (
            <p>No ladder information available.</p>
          )}

          {!ladderLoading && !ladderError && ladderEntries.length > 0 && (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>L</th>
                    <th>D</th>
                    <th>Pts</th>
                    <th>%</th>
                    <th>For</th>
                    <th>Agst</th>
                  </tr>
                </thead>
                <tbody>
                  {ladderEntries.map((entry, index) => {
                    const teamId = entry.teamId ?? null
                    const isSelected = selectedTeamId === teamId
                    return (
                      <tr
                        key={teamId ?? `${entry.teamName}-${index}`}
                        onClick={() =>
                          setSelectedTeamId(prev => (prev === teamId ? null : teamId))
                        }
                        style={{ cursor: teamId ? 'pointer' : 'default', backgroundColor: isSelected ? '#fff7cc' : undefined }}
                      >
                        <td style={{ textAlign: 'left' }}>{entry.teamName}</td>
                        <td style={{ textAlign: 'center' }}>{entry.played ?? '–'}</td>
                        <td style={{ textAlign: 'center' }}>{entry.wins ?? '–'}</td>
                        <td style={{ textAlign: 'center' }}>{entry.losses ?? '–'}</td>
                        <td style={{ textAlign: 'center' }}>{entry.draws ?? '–'}</td>
                        <td style={{ textAlign: 'center' }}>{entry.points ?? '–'}</td>
                        <td style={{ textAlign: 'center' }}>{entry.percentage ?? '–'}</td>
                        <td style={{ textAlign: 'center' }}>{entry.forPoints ?? '–'}</td>
                        <td style={{ textAlign: 'center' }}>{entry.againstPoints ?? '–'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'player-stats' && (
        <section>
          <div className="card" style={{ padding: 16 }}>
            <p className="small muted" style={{ margin: 0 }}>
              Player statistics are not available yet. Please check back later.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
