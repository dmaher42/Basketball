import React, { useEffect, useMemo, useState } from 'react'

const API_BASE = 'https://api-basketball.squadi.com/livescores'
const LADDER_BASE_URL = 'https://registration.basketballconnect.com/livescorePublicLadder'
const IGNORE_STATUSES = encodeURIComponent(JSON.stringify([1]))

const USE_PROXY = String(import.meta.env.VITE_USE_PROXY || '').toLowerCase() === 'true'

const API = {
  competitions: (orgKey, yearId) =>
    USE_PROXY
      ? `/api/bc/competitions?organisationUniqueKey=${orgKey}&yearRefId=${yearId}`
      : `${API_BASE}/competitions/list?organisationUniqueKey=${orgKey}&yearRefId=${yearId}`,
  divisions: (competitionId) =>
    USE_PROXY
      ? `/api/bc/divisions?competitionId=${competitionId}`
      : `${API_BASE}/division?competitionId=${competitionId}`,
  fixtures: (competitionId, divisionId, ignoreStatuses, teamIds = '') =>
    USE_PROXY
      ? `/api/bc/fixtures?competitionId=${competitionId}&divisionId=${divisionId}&ignoreStatuses=${ignoreStatuses}&teamIds=${teamIds}`
      : `${API_BASE}/round/matches?competitionId=${competitionId}&divisionId=${divisionId}&ignoreStatuses=${ignoreStatuses}&teamIds=${teamIds}`,
  ladderPrimary: (paramsQS) =>
    USE_PROXY
      ? `/api/bc/ladder?primary=1${paramsQS ? `&${paramsQS}` : ''}`
      : `${LADDER_BASE_URL}?${paramsQS}`,
  ladderFallback: (paramsQS) =>
    USE_PROXY
      ? `/api/bc/ladder?fallback=1${paramsQS ? `&${paramsQS}` : ''}`
      : `${API_BASE}/teams/ladder/v2?${paramsQS}`
}

const ORG_KEY = import.meta.env.VITE_ORG_KEY
const YEAR_REF_ID = Number(import.meta.env.VITE_YEAR_REF_ID)
const DEFAULT_COMPETITION_ID = String(import.meta.env.VITE_COMPETITION_ID ?? '').trim()

const TABS = [
  { id: 'ladder', label: 'Ladder' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'stats', label: 'Stats' },
  { id: 'settings', label: 'Connection' }
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

function ConfigurationPanel({
  organisationKey,
  onOrganisationKeyChange,
  yearRefId,
  onYearRefIdChange,
  hasValidConfig
}) {
  return (
    <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div>
        <h2 style={{ marginBottom: 4, fontSize: 18 }}>Connection settings</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Provide your BasketballConnect organisation key and year reference ID to load live data.
        </p>
      </div>
      {!hasValidConfig && (
        <p className="small" style={{ margin: 0, color: '#a00', fontWeight: 600 }}>
          Enter your BasketballConnect credentials or configure <code>.env</code> to access live data.
        </p>
      )}
      <label className="field">
        <span className="field-label">Organisation key</span>
        <input
          className="field-input"
          value={organisationKey}
          onChange={(event) => onOrganisationKeyChange(event.target.value)}
          placeholder="e.g. ABC123"
        />
      </label>
      <label className="field">
        <span className="field-label">Year reference ID</span>
        <input
          className="field-input"
          value={yearRefId}
          onChange={(event) => onYearRefIdChange(event.target.value)}
          placeholder="e.g. 2024"
          inputMode="numeric"
        />
      </label>
    </div>
  )
}

function SettingsView({
  organisationKey,
  onOrganisationKeyChange,
  yearRefId,
  onYearRefIdChange,
  hasValidConfig,
  defaultCompetitionId
}) {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <ConfigurationPanel
        organisationKey={organisationKey}
        onOrganisationKeyChange={onOrganisationKeyChange}
        yearRefId={yearRefId}
        onYearRefIdChange={onYearRefIdChange}
        hasValidConfig={hasValidConfig}
      />

      {defaultCompetitionId && (
        <div className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Default competition</h2>
          <p className="small muted" style={{ margin: 0 }}>
            The app automatically focuses on competition <code>{defaultCompetitionId}</code> when
            a connection is available.
          </p>
        </div>
      )}
    </div>
  )
}

function ConfigurationRequired({ onOpenSettings }) {
  return (
    <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>Connection required</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Enter a BasketballConnect organisation key and year reference ID to browse live ladders and
          fixtures.
        </p>
      </div>
      <button className="btn btn-dark" style={{ justifySelf: 'start' }} onClick={onOpenSettings}>
        Open connection settings
      </button>
    </div>
  )
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
            onChange={(event) => {
              const value = event.target.value
              onCompetitionChange(value === '' ? null : value)
            }}
            disabled={competitionLoading || competitions.length === 0}
          >
            {competitions.length === 0 && <option value="">{competitionLoading ? 'Loading…' : 'No competitions'}</option>}
            {competitions.map((competition) => (
              <option
                key={competition.id ?? competition.uniqueKey ?? competition.name}
                value={
                  competition.id != null
                    ? String(competition.id)
                    : competition.uniqueKey != null
                      ? String(competition.uniqueKey)
                      : ''
                }
              >
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

  const isCompleted = (match) =>
    typeof match.team1Score === 'number' && typeof match.team2Score === 'number'

  const now = Date.now()
  const isUpcoming = (match) => {
    if (isCompleted(match)) {
      return false
    }
    const timestamp = match.startTime || match.originalStartTime
    const parsed = timestamp ? Date.parse(timestamp) : NaN
    if (Number.isNaN(parsed)) {
      return true
    }
    return parsed >= now
  }

  const results = matches.filter(isCompleted)
  const upcoming = matches.filter(isUpcoming)

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
      {results.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Results</h2>
          <ul style={{ padding: 0, margin: 0 }}>
            {results.map((match) => (
              <MatchCard key={match.id} match={match} selectedTeamId={selectedTeamId} />
            ))}
          </ul>
        </section>
      )}
      {upcoming.length > 0 && (
        <section>
          <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Upcoming fixtures</h2>
          <ul style={{ padding: 0, margin: 0 }}>
            {upcoming.map((match) => (
              <MatchCard key={match.id} match={match} selectedTeamId={selectedTeamId} />
            ))}
          </ul>
        </section>
      )}
      {results.length === 0 && upcoming.length === 0 && <p>No matches in this round.</p>}
    </div>
  )
}

function StatsView({ organisationKey, yearRefId, selectedCompetition, selectedDivisionId }) {
  const [data, setData] = React.useState(null)
  const [error, setError] = React.useState(null)

  const competitionId = selectedCompetition?.id
  const competitionUniqueKey = selectedCompetition?.uniqueKey

  const isReady =
    organisationKey &&
    yearRefId != null &&
    competitionUniqueKey &&
    selectedDivisionId != null

  const fetchStats = React.useCallback(async () => {
    if (!isReady) {
      setData(null)
      return
    }

    try {
      setError(null)

      const params = new URLSearchParams({
        organisationKey,
        yearId: String(yearRefId),
        competitionUniqueKey,
        divisionId: String(selectedDivisionId)
      })
      if (competitionId != null) {
        params.set('competitionId', String(competitionId))
      }

      if (USE_PROXY) {
        const response = await fetch(`/api/bc/stats?${params.toString()}`, { cache: 'no-store' })
        const json = await response.json()
        if (!response.ok || !json.ok) {
          throw new Error(json.message || `Request failed with status ${response.status}`)
        }
        setData(json)
        return
      }

      const ladderParams = new URLSearchParams({
        organisationKey,
        yearId: String(yearRefId),
        includeRecentMatchData: 'true',
        competitionUniqueKey,
        divisionId: String(selectedDivisionId)
      })
      const ladderPrimaryUrl = `${LADDER_BASE_URL}?${ladderParams.toString()}`
      const ladderFallbackUrl = `${API_BASE}/teams/ladder/v2?${new URLSearchParams({
        divisionIds: String(selectedDivisionId),
        competitionKey: competitionUniqueKey
      }).toString()}`

      const fixturesParams = new URLSearchParams()
      if (competitionId != null) {
        fixturesParams.set('competitionId', String(competitionId))
      }
      fixturesParams.set('divisionId', String(selectedDivisionId))
      fixturesParams.set('ignoreStatuses', JSON.stringify([1]))
      const fixturesUrl = `${API_BASE}/round/matches?${fixturesParams.toString()}`

      let ladder = await fetchJsonNoStore(ladderPrimaryUrl)
      if (!ladder.ok) {
        ladder = await fetchJsonNoStore(ladderFallbackUrl)
      }
      if (!ladder.ok) {
        throw new Error(ladder.data?.message || 'Failed to load ladder data')
      }

      const fixtures = await fetchJsonNoStore(fixturesUrl)
      if (!fixtures.ok) {
        throw new Error(fixtures.data?.message || 'Failed to load fixtures data')
      }

      const ladderRows = normalizeLadderRows(ladder.data)
      const matches = normalizeFixturesForStats(fixtures.data)
      const summary = computeStatsSummary(ladderRows, matches)
      setData({ ok: true, ...summary })
    } catch (fetchError) {
      setError(fetchError?.message || 'Failed to load stats')
    }
  }, [competitionId, competitionUniqueKey, isReady, organisationKey, selectedDivisionId, yearRefId])

  React.useEffect(() => {
    if (!isReady) {
      return
    }
    fetchStats()
    const id = window.setInterval(fetchStats, 15000)
    return () => window.clearInterval(id)
  }, [fetchStats, isReady])

  React.useEffect(() => {
    if (!isReady) {
      setError(null)
      setData(null)
    }
  }, [isReady])

  if (!isReady) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p style={{ margin: 0 }} className="small muted">
          Select a competition and division to view live stats.
        </p>
      </div>
    )
  }

  if (error) {
    return <ErrorCard message={error} />
  }

  if (!data) {
    return <LoadingMessage text="Loading stats…" />
  }

  const leaders = Array.isArray(data.leaders) ? data.leaders : []
  const lastUpdatedDate = data.lastUpdated ? new Date(data.lastUpdated) : null
  const lastUpdatedText =
    lastUpdatedDate && !Number.isNaN(lastUpdatedDate.getTime())
      ? lastUpdatedDate.toLocaleString()
      : 'Unknown'

  return (
    <div className="card" style={{ padding: 16, display: 'grid', gap: 16 }}>
      <div className="small muted">Last updated: {lastUpdatedText}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="small muted">Upcoming games</div>
          <div className="title" style={{ fontWeight: 700, fontSize: 24 }}>{
            data.totals?.gamesUpcoming ?? '–'
          }</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="small muted">Completed games</div>
          <div className="title" style={{ fontWeight: 700, fontSize: 24 }}>{
            data.totals?.gamesCompleted ?? '–'
          }</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="small muted">Avg points (completed)</div>
          <div className="title" style={{ fontWeight: 700, fontSize: 24 }}>{
            data.pointsAvg != null ? data.pointsAvg : '–'
          }</div>
        </div>
      </div>
      <div>
        <h2 style={{ fontSize: 18, margin: '8px 0' }}>Leaders</h2>
        {leaders.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            Leaderboard data is not currently available.
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {leaders.map((leader, index) => (
              <li key={leader.id ?? leader.name ?? index}>
                {leader.name || 'Unknown team'}{' '}
                {leader.rank != null ? `(rank ${leader.rank})` : ''}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hasEnvConfig = (ORG_KEY ?? '').toString().trim() !== '' && Number.isFinite(YEAR_REF_ID)
    return hasEnvConfig ? 'ladder' : 'settings'
  })

  const [organisationKeyInput, setOrganisationKeyInput] = useState(() => (ORG_KEY ?? '').trim())
  const [yearRefIdInput, setYearRefIdInput] = useState(() =>
    Number.isFinite(YEAR_REF_ID) ? String(YEAR_REF_ID) : (import.meta.env.VITE_YEAR_REF_ID ?? '').trim()
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedOrgKey = window.localStorage.getItem('hoopsHub.organisationKey')
    const storedYearRefId = window.localStorage.getItem('hoopsHub.yearRefId')
    if (storedOrgKey) {
      setOrganisationKeyInput(storedOrgKey)
    }
    if (storedYearRefId) {
      setYearRefIdInput(storedYearRefId)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('hoopsHub.organisationKey', organisationKeyInput)
  }, [organisationKeyInput])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('hoopsHub.yearRefId', yearRefIdInput)
  }, [yearRefIdInput])

  const organisationKey = organisationKeyInput.trim()
  const parsedYearRefId = Number(yearRefIdInput)
  const yearRefId = Number.isFinite(parsedYearRefId) ? parsedYearRefId : null
  const hasValidConfig = organisationKey !== '' && yearRefId != null

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

  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [selectedRoundName, setSelectedRoundName] = useState('')

  useEffect(() => {
    setCompetitions([])
    setSelectedCompetitionId(null)
    setDivisions([])
    setSelectedDivisionId(null)
    setSelectedTeamId(null)
  }, [organisationKey, yearRefId])

  useEffect(() => {
    if (!hasValidConfig) {
      setCompetitionLoading(false)
      setCompetitionError(
        'Open the Connection tab to enter your BasketballConnect organisation key and year reference ID.'
      )
      return
    }

    let cancelled = false
    setCompetitionLoading(true)
    setCompetitionError(null)

    async function fetchCompetitions() {
      try {
        const url = API.competitions(organisationKey, yearRefId)
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = await response.json()
        if (!cancelled) {
          setCompetitions(Array.isArray(data) ? data : [])
          if (Array.isArray(data) && data.length > 0) {
            const defaultIdentifier = DEFAULT_COMPETITION_ID.toLowerCase()
            const preferredCompetition =
              defaultIdentifier !== ''
                ? data.find((competition) => {
                    const identifiers = [
                      competition.id,
                      competition.uniqueKey,
                      competition.competitionId,
                      competition.competitionUniqueKey
                    ]
                    return identifiers.some((value) => {
                      if (value == null) return false
                      return String(value).trim().toLowerCase() === defaultIdentifier
                    })
                  })
                : null
            const fallbackCompetition = preferredCompetition ?? data[0]
            const initialCompetitionIdentifier =
              fallbackCompetition?.id ??
              fallbackCompetition?.uniqueKey ??
              fallbackCompetition?.competitionId ??
              fallbackCompetition?.competitionUniqueKey ??
              null
            setSelectedCompetitionId(
              initialCompetitionIdentifier != null ? String(initialCompetitionIdentifier) : null
            )
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
  }, [organisationKey, yearRefId, hasValidConfig])

  const selectedCompetition = useMemo(() => {
    if (selectedCompetitionId == null) {
      return null
    }
    const normalizedId = String(selectedCompetitionId)
    return (
      competitions.find((competition) => {
        const identifiers = [
          competition.id,
          competition.uniqueKey,
          competition.competitionId,
          competition.competitionUniqueKey
        ]
        return identifiers.some((value) => value != null && String(value) === normalizedId)
      }) || null
    )
  }, [competitions, selectedCompetitionId])

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
        const url = API.divisions(selectedCompetition.id)
        const response = await fetch(url)
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
    if (!selectedCompetition || !selectedDivisionId || !hasValidConfig || yearRefId == null) {
      setLadderState({ rows: [], lastResults: [], nextResults: [] })
      setMatches([])
      return
    }

    let cancelled = false

    async function fetchLadder() {
      setLadderLoading(true)
      setLadderError(null)
      try {
        const ladderParams = new URLSearchParams({
          organisationKey,
          yearId: String(yearRefId),
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
          const primaryUrl = API.ladderPrimary(ladderParams.toString())
          ladderData = await requestLadder(primaryUrl)
        } catch (ladderError) {
          const fallbackParams = new URLSearchParams({
            divisionIds: String(selectedDivisionId),
            competitionKey: selectedCompetition.uniqueKey
          })
          const fallbackUrl = API.ladderFallback(fallbackParams.toString())
          ladderData = await requestLadder(fallbackUrl)
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
        const url = API.fixtures(selectedCompetition.id, selectedDivisionId, IGNORE_STATUSES, '')
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
  }, [selectedCompetition, selectedDivisionId, hasValidConfig, organisationKey, yearRefId])

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

  const availableRounds = useMemo(() => {
    const names = new Set()
    for (const match of filteredMatches || []) {
      const name = match.round?.name?.trim()
      if (name) {
        names.add(name)
      }
    }
    return Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [filteredMatches])

  const roundFilteredMatches = useMemo(() => {
    if (!selectedRoundName) {
      return filteredMatches
    }
    return (filteredMatches || []).filter(
      (match) => (match.round?.name || '').trim() === selectedRoundName
    )
  }, [filteredMatches, selectedRoundName])

  useEffect(() => {
    if (!selectedRoundName) {
      return
    }
    if (!availableRounds.includes(selectedRoundName)) {
      setSelectedRoundName('')
    }
  }, [availableRounds, selectedRoundName])

  return (
    <div className="container" style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Live Scores</h1>
        <p className="small muted">
          Browse ladders and fixtures for BasketballConnect competitions, or configure your connection
          from the tabs below.
        </p>
      </header>

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

      {activeTab === 'settings' ? (
        <SettingsView
          organisationKey={organisationKeyInput}
          onOrganisationKeyChange={setOrganisationKeyInput}
          yearRefId={yearRefIdInput}
          onYearRefIdChange={setYearRefIdInput}
          hasValidConfig={hasValidConfig}
          defaultCompetitionId={DEFAULT_COMPETITION_ID}
        />
      ) : hasValidConfig ? (
        <>
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

          {(activeTab === 'ladder' || activeTab === 'fixtures') && (
            <TeamSelector
              teams={ladderRows}
              selectedTeamId={selectedTeamId}
              onSelectTeam={(value) => setSelectedTeamId(value || null)}
            />
          )}

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
          ) : (
            <>
              <RoundSelector
                rounds={availableRounds}
                selectedRound={selectedRoundName}
                onSelectRound={setSelectedRoundName}
              />
              <FixturesView
                matches={roundFilteredMatches}
                loading={matchesLoading}
                error={matchesError}
                selectedTeamId={selectedTeamId}
                selectedTeamName={selectedTeam?.name ?? selectedTeam?.teamName}
                onClearTeam={() => setSelectedTeamId(null)}
              />
            </>
          )}

          {activeTab === 'stats' && (
            <StatsView
              organisationKey={organisationKey}
              yearRefId={yearRefId}
              selectedCompetition={selectedCompetition}
              selectedDivisionId={selectedDivisionId}
            />
          )}
        </>
      ) : (
        <ConfigurationRequired onOpenSettings={() => setActiveTab('settings')} />
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

function RoundSelector({ rounds, selectedRound, onSelectRound }) {
  if (!rounds || rounds.length === 0) {
    return null
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <label className="field" style={{ marginBottom: 0 }}>
        <span className="field-label">Round</span>
        <select
          className="field-input"
          value={selectedRound}
          onChange={(event) => onSelectRound(event.target.value)}
        >
          <option value="">All rounds</option>
          {rounds.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="field-help">Filter fixtures by round.</span>
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

async function fetchJsonNoStore(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    const text = await response.text()
    let data = {}
    if (text) {
      try {
        data = JSON.parse(text)
      } catch (error) {
        data = { message: text }
      }
    }
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, data: { message: error?.message || 'Network error' } }
  }
}

function normalizeFixturesForStats(fixturesData) {
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

function computeLeadersForStats(ladderRows, matches) {
  const sorted = [...ladderRows]
    .filter((team) => team.name)
    .sort((a, b) => (a.rk ?? a.rank ?? a.position ?? Number.POSITIVE_INFINITY) - (b.rk ?? b.rank ?? b.position ?? Number.POSITIVE_INFINITY))
    .slice(0, 3)
    .map((team) => ({ id: team.id, name: team.name, rank: team.rk ?? team.rank ?? team.position ?? null }))

  if (sorted.length > 0) {
    return sorted
  }

  const fallbackTeams = ladderRows.filter((team) => team.name).slice(0, 3)
  if (fallbackTeams.length > 0) {
    return fallbackTeams.map((team) => ({ id: team.id, name: team.name, rank: null }))
  }

  const seen = new Set()
  const names = []
  for (const match of matches) {
    for (const name of [match.team1?.name, match.team2?.name]) {
      if (!name || seen.has(name)) {
        continue
      }
      seen.add(name)
      names.push(name)
      if (names.length === 3) {
        break
      }
    }
    if (names.length === 3) {
      break
    }
  }

  return names.map((name) => ({ id: name, name, rank: null }))
}

function computeStatsSummary(ladderRows, matches) {
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

  const leaders = computeLeadersForStats(ladderRows, matches)

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
