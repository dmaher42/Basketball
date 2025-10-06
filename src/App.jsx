import React, { useEffect, useMemo, useState } from 'react'

const ORG_KEY = '3416293c-d99b-47de-8866-74a6138f0740'
const YEAR_REF_ID = 8
const API_BASE = 'https://api-basketball.squadi.com/livescores'
const LADDER_BASE_URL = 'https://registration.basketballconnect.com/livescorePublicLadder'
const IGNORE_STATUSES = encodeURIComponent(JSON.stringify([1]))
const SPORT_REF_ID = 2

const TABS = [
  { id: 'ladder', label: 'Ladder' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'player-stats', label: 'Player Stats' }
]

function formatDateTime(isoString) {
  if (!isoString) {
    return { date: 'Date TBA', time: 'Time TBA' }
  }
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return { date: 'Date TBA', time: 'Time TBA' }
  }
  return {
    date: date.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

function MatchCard({ match, selectedTeamId }) {
  const { date, time } = formatDateTime(match.startTime || match.originalStartTime)
  const team1Selected =
    selectedTeamId != null && match.team1?.id != null && String(match.team1.id) === String(selectedTeamId)
  const team2Selected =
    selectedTeamId != null && match.team2?.id != null && String(match.team2.id) === String(selectedTeamId)
  const score1 = typeof match.team1Score === 'number' ? match.team1Score : '–'
  const score2 = typeof match.team2Score === 'number' ? match.team2Score : '–'
  const highlightStyle = {
    fontWeight: 700,
    color: '#111'
  }

  return (
    <li className="card" style={{ marginBottom: 12, padding: 16, listStyle: 'none' }}>
      <div className="small muted" style={{ marginBottom: 4 }}>
        {match.round?.name ? `${match.round.name} · ` : ''}{date} · {time}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="title" style={{ marginBottom: 4, ...(team1Selected ? highlightStyle : null) }}>
            {match.team1?.name ?? 'TBD'}
          </div>
          <div className="title" style={team2Selected ? highlightStyle : null}>
            {match.team2?.name ?? 'TBD'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="title" style={{ fontWeight: 700 }}>{score1} – {score2}</div>
          {match.resultStatus && (
            <div className="small muted" style={{ marginTop: 4 }}>{match.resultStatus}</div>
          )}
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

function ErrorCard({ message }) {
  if (!message) return null
  return (
    <div
      className="card"
      style={{ padding: 16, marginBottom: 16, color: '#d00', background: '#fee', border: '1px solid #f99' }}
    >
      <strong>Error:</strong> {message}
    </div>
  )
}

function LoadingMessage({ text }) {
  if (!text) return null
  return <p className="small muted" style={{ margin: '16px 0' }}>{text}</p>
}

function CompetitionSelectors({
  competitions,
  competitionLoading,
  competitionError,
  selectedCompetitionId,
  onCompetitionChange,
  divisions,
  divisionLoading,
  divisionError,
  selectedDivisionId,
  onDivisionChange
}) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div className="selector-grid">
        <label className="field">
          <span className="field-label">Competition</span>
          <select
            className="field-input"
            value={selectedCompetitionId ?? ''}
            onChange={(event) => onCompetitionChange(Number(event.target.value))}
            disabled={competitionLoading || competitions.length === 0}
          >
            {competitions.length === 0 && <option value="">{competitionLoading ? 'Loading…' : 'No competitions'}</option>}
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.longName || competition.name}
              </option>
            ))}
          </select>
          {competitionError && <span className="field-help">{competitionError}</span>}
        </label>

        <label className="field">
          <span className="field-label">Division</span>
          <select
            className="field-input"
            value={selectedDivisionId ?? ''}
            onChange={(event) => onDivisionChange(Number(event.target.value))}
            disabled={divisionLoading || divisions.length === 0}
          >
            {divisions.length === 0 && <option value="">{divisionLoading ? 'Loading…' : 'No divisions'}</option>}
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
          {divisionError && <span className="field-help">{divisionError}</span>}
        </label>
      </div>
    </div>
  )
}

function LadderTable({
  ladderRows,
  loading,
  error,
  onSelectTeam,
  selectedTeamId
}) {
  if (loading) {
    return <LoadingMessage text="Loading ladder…" />
  }

  if (error) {
    return <ErrorCard message={error} />
  }

  if (!ladderRows || ladderRows.length === 0) {
    return <p>No ladder data available.</p>
  }

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>#</th>
            <th style={{ textAlign: 'left' }}>Team</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>F</th>
            <th>A</th>
            <th>Pts</th>
            <th style={{ textAlign: 'left' }}>Form</th>
          </tr>
        </thead>
        <tbody>
          {ladderRows.map((team) => {
            const teamId = team.id ?? team.teamId ?? team.teamUniqueKey ?? team.teamName
            const isSelected = selectedTeamId != null && String(selectedTeamId) === String(teamId)
            return (
              <tr
                key={teamId ?? team.name}
                className={isSelected ? 'highlight' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTeam(teamId)}
              >
                <td>{team.rk ?? team.rank ?? team.position ?? '–'}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="title" style={{ fontWeight: 600 }}>{team.name ?? team.teamName ?? 'Unknown team'}</span>
                    <span className="small muted">{team.divisionName ?? team.poolName ?? ''}</span>
                  </div>
                </td>
                <td>{team.P ?? team.played ?? team.playedGames ?? '–'}</td>
                <td>{team.W ?? team.won ?? team.wins ?? '–'}</td>
                <td>{team.L ?? team.lost ?? team.losses ?? '–'}</td>
                <td>{team.F ?? team.for ?? team.forPoints ?? '–'}</td>
                <td>{team.A ?? team.against ?? team.againstPoints ?? '–'}</td>
                <td>{team.PTS ?? team.points ?? team.totalPoints ?? '–'}</td>
                <td>
                  <span className="small muted">{team.form?.join(' ') || '–'}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FixturesView({
  matches,
  loading,
  error,
  selectedTeamId,
  selectedTeamName,
  onClearTeam
}) {
  if (loading) {
    return <LoadingMessage text="Loading fixtures…" />
  }

  if (error) {
    return <ErrorCard message={error} />
  }

  if (!matches || matches.length === 0) {
    return <p>No fixtures available.</p>
  }

  return (
    <div>
      {selectedTeamId && (
        <div className="pill" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Viewing matches for <strong>{selectedTeamName}</strong>
          <button className="btn" style={{ padding: '4px 8px' }} onClick={onClearTeam}>
            Clear
          </button>
        </div>
      )}
      <ul style={{ padding: 0, margin: 0 }}>
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} selectedTeamId={selectedTeamId} />
        ))}
      </ul>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('ladder')

  const [competitions, setCompetitions] = useState([])
  const [competitionLoading, setCompetitionLoading] = useState(true)
  const [competitionError, setCompetitionError] = useState(null)
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null)

  const [divisions, setDivisions] = useState([])
  const [divisionLoading, setDivisionLoading] = useState(false)
  const [divisionError, setDivisionError] = useState(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState(null)

  const [ladderState, setLadderState] = useState({ rows: [], lastResults: [], nextResults: [] })
  const [ladderLoading, setLadderLoading] = useState(false)
  const [ladderError, setLadderError] = useState(null)

  const [matches, setMatches] = useState([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [matchesError, setMatchesError] = useState(null)

  const [playerStatsState, setPlayerStatsState] = useState({ entries: [], loading: false, error: null })

  const [selectedTeamId, setSelectedTeamId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCompetitions() {
      setCompetitionLoading(true)
      setCompetitionError(null)
      try {
        const response = await fetch(
          `${API_BASE}/competitions/list?organisationUniqueKey=${ORG_KEY}&yearRefId=${YEAR_REF_ID}`
        )
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = await response.json()
        if (!cancelled) {
          setCompetitions(Array.isArray(data) ? data : [])
          if (Array.isArray(data) && data.length > 0) {
            setSelectedCompetitionId(data[0].id)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setCompetitionError(error.message || 'Failed to load competitions')
        }
      } finally {
        if (!cancelled) {
          setCompetitionLoading(false)
        }
      }
    }

    fetchCompetitions()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedCompetition = useMemo(
    () => competitions.find((competition) => competition.id === selectedCompetitionId) || null,
    [competitions, selectedCompetitionId]
  )

  const selectedDivision = useMemo(
    () => divisions.find((division) => division.id === selectedDivisionId) || null,
    [divisions, selectedDivisionId]
  )

  useEffect(() => {
    if (!selectedCompetition) {
      setDivisions([])
      setSelectedDivisionId(null)
      return
    }

    let cancelled = false
    setDivisionLoading(true)
    setDivisionError(null)
    setDivisions([])

    async function fetchDivisions() {
      try {
        const response = await fetch(`${API_BASE}/division?competitionId=${selectedCompetition.id}`)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = await response.json()
        if (!cancelled) {
          setDivisions(Array.isArray(data) ? data : [])
          if (Array.isArray(data) && data.length > 0) {
            setSelectedDivisionId(data[0].id)
          } else {
            setSelectedDivisionId(null)
          }
          setSelectedTeamId(null)
        }
      } catch (error) {
        if (!cancelled) {
          setDivisionError(error.message || 'Failed to load divisions')
          setSelectedDivisionId(null)
        }
      } finally {
        if (!cancelled) {
          setDivisionLoading(false)
        }
      }
    }

    fetchDivisions()

    return () => {
      cancelled = true
    }
  }, [selectedCompetition])

  useEffect(() => {
    if (!selectedCompetition || !selectedDivisionId) {
      setLadderState({ rows: [], lastResults: [], nextResults: [] })
      setMatches([])
      setPlayerStatsState({ entries: [], loading: false, error: null })
      return
    }

    let cancelled = false

    async function fetchLadder() {
      setLadderLoading(true)
      setLadderError(null)
      try {
        const ladderParams = new URLSearchParams({
          organisationKey: ORG_KEY,
          yearId: String(YEAR_REF_ID),
          includeRecentMatchData: 'true',
          competitionUniqueKey: selectedCompetition.uniqueKey,
          divisionId: String(selectedDivisionId)
        })

        async function requestLadder(url) {
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`)
          }
          const contentType = response.headers.get('content-type') || ''
          if (!contentType.includes('application/json')) {
            const text = await response.text()
            try {
              return JSON.parse(text)
            } catch (parseError) {
              throw new Error('Unexpected ladder response format')
            }
          }
          return await response.json()
        }

        let ladderData
        try {
          ladderData = await requestLadder(`${LADDER_BASE_URL}?${ladderParams.toString()}`)
        } catch (ladderError) {
          const fallbackParams = new URLSearchParams({
            divisionIds: String(selectedDivisionId),
            competitionKey: selectedCompetition.uniqueKey
          })
          ladderData = await requestLadder(`${API_BASE}/teams/ladder/v2?${fallbackParams.toString()}`)
        }

        if (!cancelled) {
          const rows = normalizeLadderRows(ladderData)
          const lastResults = normalizeRecentResults(ladderData)
          const nextResults = Array.isArray(ladderData?.nextResults)
            ? ladderData.nextResults
            : Array.isArray(ladderData?.recentMatchData?.nextResults)
              ? ladderData.recentMatchData.nextResults
              : []

          setLadderState({ rows, lastResults, nextResults })
          setSelectedTeamId((current) =>
            rows.some((team) => String(team.id ?? team.teamId ?? team.teamUniqueKey) === String(current))
              ? current
              : null
          )
        }
      } catch (error) {
        if (!cancelled) {
          setLadderError(error.message || 'Failed to load ladder')
          setLadderState({ rows: [], lastResults: [], nextResults: [] })
        }
      } finally {
        if (!cancelled) {
          setLadderLoading(false)
        }
      }
    }

    async function fetchMatches() {
      setMatchesLoading(true)
      setMatchesError(null)
      try {
        const url = `${API_BASE}/round/matches?competitionId=${selectedCompetition.id}&divisionId=${selectedDivisionId}&teamIds=&ignoreStatuses=${IGNORE_STATUSES}`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = await response.json()
        const allMatches = (data.rounds || []).flatMap((round) =>
          (round.matches || []).map((match) => ({
            ...match,
            round: match.round || { name: round.name }
          }))
        )
        if (!cancelled) {
          setMatches(allMatches)
        }
      } catch (error) {
        if (!cancelled) {
          setMatchesError(error.message || 'Failed to load fixtures')
          setMatches([])
        }
      } finally {
        if (!cancelled) {
          setMatchesLoading(false)
        }
      }
    }

    fetchLadder()
    fetchMatches()

    return () => {
      cancelled = true
    }
  }, [selectedCompetition, selectedDivisionId])

  useEffect(() => {
    if (!selectedCompetition || !selectedDivisionId) {
      setPlayerStatsState({ entries: [], loading: false, error: null })
      return
    }

    let cancelled = false
    setPlayerStatsState({ entries: [], loading: true, error: null })

    async function fetchPlayerStats() {
      const aggregatedEntries = []
      let offset = 0
      const limit = 200

      try {
        while (!cancelled) {
          const params = new URLSearchParams({
            competitionId: String(selectedCompetition.id),
            divisionId: String(selectedDivisionId),
            aggregate: 'ALL',
            sportRefId: String(SPORT_REF_ID),
            limit: String(limit),
            offset: String(offset)
          })

          const response = await fetch(`${API_BASE}/stats/public/v2/scoringByPlayer?${params.toString()}`)
          if (cancelled) {
            return
          }
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`)
          }

          let data
          try {
            data = await response.json()
          } catch (parseError) {
            throw new Error('Unexpected player statistics response format')
          }

          const pageEntries = Array.isArray(data?.result) ? data.result : []
          aggregatedEntries.push(...pageEntries)

          const nextPageValue = Number(data?.page?.nextPage ?? 0)
          if (!Number.isFinite(nextPageValue) || nextPageValue <= offset || pageEntries.length === 0) {
            break
          }
          offset = nextPageValue
        }

        if (!cancelled) {
          setPlayerStatsState({ entries: aggregatedEntries, loading: false, error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setPlayerStatsState({
            entries: [],
            loading: false,
            error: error?.message || 'Failed to load player statistics'
          })
        }
      }
    }

    fetchPlayerStats()

    return () => {
      cancelled = true
    }
  }, [selectedCompetition, selectedDivisionId])

  const ladderRows = useMemo(() => {
    const lastResultsMap = new Map()
    for (const item of ladderState.lastResults || []) {
      const key = item.teamId ?? item.team?.id ?? item.teamUniqueKey
      lastResultsMap.set(String(key), item.last5 || item.form || [])
    }

    return (ladderState.rows || []).map((team) => {
      const id = team.id ?? team.teamId ?? team.teamUniqueKey
      const formEntries = lastResultsMap.get(String(id)) || []
      return {
        ...team,
        id,
        name: team.name ?? team.teamName ?? team.team?.name,
        form: formEntries.map((entry) => {
          const code = typeof entry === 'string' ? entry : entry.code || entry.result || entry.outcome
          if (!code) return '–'
          const upperCode = code.toUpperCase()
          if (upperCode.startsWith('W')) return 'W'
          if (upperCode.startsWith('D')) return 'D'
          if (upperCode.startsWith('L')) return 'L'
          return upperCode[0]
        })
      }
    })
  }, [ladderState])

  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null
    return (
      ladderRows.find(
        (team) => String(team.id ?? team.teamId ?? team.teamUniqueKey) === String(selectedTeamId)
      ) || null
    )
  }, [ladderRows, selectedTeamId])

  const filteredMatches = useMemo(() => {
    if (!selectedTeamId) {
      return matches
    }
    return matches.filter((match) => {
      const team1Id = match.team1?.id != null ? String(match.team1.id) : null
      const team2Id = match.team2?.id != null ? String(match.team2.id) : null
      return team1Id === String(selectedTeamId) || team2Id === String(selectedTeamId)
    })
  }, [matches, selectedTeamId])

  const playerStatsIndex = useMemo(
    () => buildPlayerStatsIndex(playerStatsState.entries),
    [playerStatsState.entries]
  )

  const selectedTeamStats = useMemo(
    () => getPlayerStatsForTeam(playerStatsIndex, selectedTeamId, selectedTeam),
    [playerStatsIndex, selectedTeamId, selectedTeam]
  )

  return (
    <div className="container" style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Live Scores</h1>
        <p className="small muted">Browse ladders, fixtures and player stats for BasketballConnect competitions.</p>
      </header>

      <CompetitionSelectors
        competitions={competitions}
        competitionLoading={competitionLoading}
        competitionError={competitionError}
        selectedCompetitionId={selectedCompetitionId}
        onCompetitionChange={setSelectedCompetitionId}
        divisions={divisions}
        divisionLoading={divisionLoading}
        divisionError={divisionError}
        selectedDivisionId={selectedDivisionId}
        onDivisionChange={(divisionId) => {
          setSelectedDivisionId(divisionId)
          setSelectedTeamId(null)
        }}
      />

      <TeamSelector
        teams={ladderRows}
        selectedTeamId={selectedTeamId}
        onSelectTeam={(value) => setSelectedTeamId(value || null)}
      />

      <nav className="tabs" style={{ marginBottom: 24 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-dark' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'ladder' && (
        <div>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Click or tap a team to highlight it and filter fixtures.
          </p>
          <LadderTable
            ladderRows={ladderRows}
            loading={ladderLoading}
            error={ladderError}
            onSelectTeam={(teamId) =>
              setSelectedTeamId((current) => (String(current) === String(teamId) ? null : String(teamId)))
            }
            selectedTeamId={selectedTeamId}
          />
        </div>
      )}

      {activeTab === 'fixtures' && (
        <FixturesView
          matches={filteredMatches}
          loading={matchesLoading}
          error={matchesError}
          selectedTeamId={selectedTeamId}
          selectedTeamName={selectedTeam?.name ?? selectedTeam?.teamName}
          onClearTeam={() => setSelectedTeamId(null)}
        />
      )}

      {activeTab === 'player-stats' && (
        <PlayerStatsView
          loading={playerStatsState.loading}
          error={playerStatsState.error}
          selectedTeamId={selectedTeamId}
          selectedTeam={selectedTeam}
          selectedTeamStats={selectedTeamStats}
          leaders={playerStatsIndex.leaders}
          hasStats={playerStatsIndex.hasData}
          competitionName={selectedCompetition?.longName || selectedCompetition?.name}
          divisionName={selectedDivision?.name ?? selectedDivision?.divisionName}
        />
      )}
    </div>
  )
}

function TeamSelector({ teams, selectedTeamId, onSelectTeam }) {
  const sortedTeams = useMemo(() => {
    return [...(teams || [])]
      .map((team) => ({
        id: team.id ?? team.teamId ?? team.teamUniqueKey ?? team.teamName,
        name: team.name ?? team.teamName ?? team.team?.name ?? 'Unknown team'
      }))
      .filter((team) => team.id != null && team.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [teams])

  if (sortedTeams.length === 0) {
    return null
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <label className="field" style={{ marginBottom: 0 }}>
        <span className="field-label">Team</span>
        <select
          className="field-input"
          value={selectedTeamId ?? ''}
          onChange={(event) => {
            const value = event.target.value
            onSelectTeam(value === '' ? null : String(value))
          }}
        >
          <option value="">All teams</option>
          {sortedTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <span className="field-help">Use the dropdown or click a team in the ladder to focus their fixtures.</span>
      </label>
    </div>
  )
}

function normalizeLadderRows(ladderData) {
  if (!ladderData) {
    return []
  }

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
    ...team,
    id: team.id ?? team.teamId ?? team.teamUniqueKey ?? team.team?.id ?? team.teamName,
    name: team.name ?? team.teamName ?? team.team?.name
  }))
}

function normalizeRecentResults(ladderData) {
  if (!ladderData) {
    return []
  }

  const candidates = [
    ladderData?.lastResults,
    ladderData?.recentMatchData?.lastResults,
    ladderData?.recentMatches,
    ladderData?.ladderRecentMatchData?.lastResults
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

function PlayerStatsView({
  loading,
  error,
  selectedTeamId,
  selectedTeam,
  selectedTeamStats,
  leaders,
  hasStats,
  competitionName,
  divisionName
}) {
  if (error) {
    return <ErrorCard message={error} />
  }

  const hasSelectedTeam = Boolean(selectedTeamId)
  const teamPlayers = selectedTeamStats?.players?.length ? [...selectedTeamStats.players] : []
  teamPlayers.sort((a, b) => {
    const ppgDiff = (b.ppg ?? 0) - (a.ppg ?? 0)
    if (ppgDiff !== 0) return ppgDiff
    const ptsDiff = (b.pts ?? 0) - (a.pts ?? 0)
    if (ptsDiff !== 0) return ptsDiff
    return (a.name || '').localeCompare(b.name || '')
  })

  const teamDisplayName =
    selectedTeam?.name ??
    selectedTeam?.teamName ??
    selectedTeamStats?.team?.name ??
    (hasSelectedTeam ? 'Selected team' : null)

  const teamDivision =
    selectedTeamStats?.team?.division ??
    selectedTeamStats?.team?.divisionName ??
    selectedTeam?.divisionName ??
    selectedTeam?.poolName ??
    null

  const topPlayers = Array.isArray(leaders) ? leaders.slice(0, 10) : []

  const contextLine = [divisionName, competitionName].filter(Boolean).join(' · ')

  if (loading) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Player statistics</h2>
        {contextLine && <p className="small muted" style={{ marginBottom: 16 }}>{contextLine}</p>}
        <LoadingMessage text="Loading player statistics…" />
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Player statistics</h2>
      {contextLine && <p className="small muted" style={{ marginBottom: 16 }}>{contextLine}</p>}

      {hasSelectedTeam ? (
        teamPlayers.length > 0 ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div className="title" style={{ fontSize: 18 }}>{teamDisplayName}</div>
              {teamDivision && <div className="small muted">{teamDivision}</div>}
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ textAlign: 'left' }}>Player</th>
                  <th>GP</th>
                  <th>PTS</th>
                  <th>PPG</th>
                </tr>
              </thead>
              <tbody>
                {teamPlayers.map((player, index) => (
                  <tr key={player.id ?? `${player.name}-${index}`}>
                    <td>{index + 1}</td>
                    <td style={{ textAlign: 'left' }}>{player.name ?? 'Unknown player'}</td>
                    <td>{formatIntegerStat(player.gp)}</td>
                    <td>{formatIntegerStat(player.pts)}</td>
                    <td>{formatAverageStat(player.ppg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <p className="muted" style={{ marginBottom: topPlayers.length > 0 ? 16 : 0 }}>
              Player statistics for <strong>{teamDisplayName}</strong> are not available yet. Select another team or check back
              once stats have been recorded.
            </p>
            {topPlayers.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 8, marginTop: 0 }}>Division leaders</h3>
                <LeadersTable players={topPlayers} />
              </div>
            )}
          </div>
        )
      ) : topPlayers.length > 0 ? (
        <div>
          <p className="muted">
            Select a team from the ladder or dropdown to view detailed player numbers. In the meantime, here are the current division
            leaders.
          </p>
          <LeadersTable players={topPlayers} />
        </div>
      ) : (
        <p className="muted">Player statistics will appear here once data has been provided for this competition.</p>
      )}

      {hasStats && (
        <p className="small muted" style={{ marginTop: 16 }}>
          Data source: BasketballConnect live scoring feed.
        </p>
      )}
    </div>
  )
}

function LeadersTable({ players }) {
  if (!players || players.length === 0) {
    return null
  }

  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: 40 }}>#</th>
          <th style={{ textAlign: 'left' }}>Player</th>
          <th style={{ textAlign: 'left' }}>Team</th>
          <th>GP</th>
          <th>PTS</th>
          <th>PPG</th>
        </tr>
      </thead>
      <tbody>
        {players.map((player, index) => (
          <tr key={`${player.teamId}-${player.id ?? player.name ?? index}`}>
            <td>{index + 1}</td>
            <td style={{ textAlign: 'left' }}>{player.name ?? 'Unknown player'}</td>
            <td style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{player.teamName ?? 'Unknown team'}</span>
                {player.division && <span className="small muted">{player.division}</span>}
              </div>
            </td>
            <td>{formatIntegerStat(player.gp)}</td>
            <td>{formatIntegerStat(player.pts)}</td>
            <td>{formatAverageStat(player.ppg)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function buildPlayerStatsIndex(entries) {
  const empty = {
    byId: new Map(),
    byName: new Map(),
    leaders: [],
    hasData: false
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return empty
  }

  for (const record of entries) {
    if (!record) {
      continue
    }

    const rawTeamId =
      record.actualPlayerTeamId ??
      record.teamId ??
      record.teamUniqueKey ??
      (record.teamName ? normalizeTeamName(record.teamName) : null)
    if (rawTeamId == null) {
      continue
    }

    const teamId = String(rawTeamId)
    const teamNameCandidates = [record.teamName, record.team2Name, record.team1Name, teamId]
    const teamName = teamNameCandidates.find((value) => typeof value === 'string' && value.trim() !== '')?.trim() ?? teamId
    const division = record.divisionName ?? record.division ?? null

    let teamEntry = empty.byId.get(teamId)
    if (!teamEntry) {
      const teamMeta = { id: teamId, name: teamName, division }
      teamEntry = { teamId, team: teamMeta, players: [] }
      empty.byId.set(teamId, teamEntry)
      const normalizedTeamName = normalizeTeamName(teamName)
      if (normalizedTeamName) {
        empty.byName.set(normalizedTeamName, teamEntry)
      }
    } else if (division && !teamEntry.team?.division) {
      teamEntry.team = { ...teamEntry.team, division }
    }

    const playerNameParts = [record.firstName, record.lastName].filter(Boolean)
    let playerName = playerNameParts.join(' ').trim()
    if (!playerName) {
      if (record.shirt) {
        playerName = `#${record.shirt}`
      } else if (record.playerId != null) {
        playerName = `Player ${record.playerId}`
      } else {
        playerName = 'Unknown player'
      }
    }

    const playerId = record.playerId ?? record.userId ?? `${teamId}-${playerName}`
    const player = {
      id: playerId,
      name: playerName,
      gp: toNumber(record.totalMatches ?? record.matchesPlayed ?? record.matches),
      pts: toNumber(record.totalPts ?? record.PTS ?? record.totalPoints),
      ppg: toNumber(record.avgPts ?? record.avgPoints ?? record.pointsPerGame)
    }

    teamEntry.players.push(player)

    empty.leaders.push({
      ...player,
      teamId,
      teamName: teamEntry.team?.name ?? teamName ?? teamId,
      division: teamEntry.team?.division ?? division ?? null
    })
  }

  if (empty.leaders.length > 0) {
    empty.hasData = true
  }

  empty.leaders.sort((a, b) => {
    const ppgDiff = (b.ppg ?? 0) - (a.ppg ?? 0)
    if (ppgDiff !== 0) return ppgDiff
    const ptsDiff = (b.pts ?? 0) - (a.pts ?? 0)
    if (ptsDiff !== 0) return ptsDiff
    return (a.name || '').localeCompare(b.name || '')
  })

  return empty
}

function getPlayerStatsForTeam(index, teamId, selectedTeam) {
  if (!index) {
    return null
  }

  const idKey = teamId != null ? String(teamId) : null
  if (idKey && index.byId.has(idKey)) {
    return index.byId.get(idKey)
  }

  const candidateNames = [
    selectedTeam?.name,
    selectedTeam?.teamName,
    selectedTeam?.team?.name,
    selectedTeam?.team?.teamName
  ]

  for (const name of candidateNames) {
    const normalized = normalizeTeamName(name)
    if (normalized && index.byName.has(normalized)) {
      return index.byName.get(normalized)
    }
  }

  return null
}

function normalizeTeamName(name) {
  if (typeof name !== 'string') {
    return ''
  }
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatIntegerStat(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString()
  }
  return '–'
}

function formatAverageStat(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(1)
  }
  return '–'
}
