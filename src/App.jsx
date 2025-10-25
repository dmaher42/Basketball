import React, { useEffect, useMemo, useRef, useState } from 'react'
import SavedTeamsView from './components/SavedTeamsView'
import TopScorersView from './components/TopScorersView'

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

  return (
    <li className="card match-card">
      <div className="small muted match-card__meta">
        {match.round?.name ? `${match.round.name} · ` : ''}{date} · {time}
      </div>
      <div className="match-card__content">
        <div className="match-card__teams">
          <div className={`title ${team1Selected ? 'highlight-text' : ''}`}>
            {match.team1?.name ?? 'TBD'}
          </div>
          <div className={`title ${team2Selected ? 'highlight-text' : ''}`}>
            {match.team2?.name ?? 'TBD'}
          </div>
        </div>
        <div className="match-card__score">
          <div className="title">{score1} – {score2}</div>
          {match.resultStatus && (
            <div className="small muted">{match.resultStatus}</div>
          )}
        </div>
      </div>
      {match.venueCourt?.venue?.name && (
        <div className="small muted match-card__venue">
          {match.venueCourt.venue.name}{match.venueCourt.name ? ` · ${match.venueCourt.name}` : ''}
        </div>
      )}
    </li>
  )
}

function ErrorCard({ message }) {
  if (!message) return null
  return (
    <div className="card card-error">
      <strong>Error:</strong> {message}
    </div>
  )
}

function LoadingMessage({ text }) {
  if (!text) return null
  return <p className="small muted loading-message">{text}</p>
}

function ConfigurationPanel({
  organisationKey,
  onOrganisationKeyChange,
  yearRefId,
  onYearRefIdChange,
  hasValidConfig
}) {
  return (
    <div className="card stack settings-card">
      <div className="stack-sm">
        <h2 className="section-title">Connection settings</h2>
        <p className="small muted">
          Provide your BasketballConnect organisation key and year reference ID to load live data.
        </p>
      </div>
      {!hasValidConfig && (
        <p className="small field-help">
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
    <div className="stack-lg">
      <ConfigurationPanel
        organisationKey={organisationKey}
        onOrganisationKeyChange={onOrganisationKeyChange}
        yearRefId={yearRefId}
        onYearRefIdChange={onYearRefIdChange}
        hasValidConfig={hasValidConfig}
      />

      {defaultCompetitionId && (
        <div className="card stack-sm">
          <h2 className="section-title">Default competition</h2>
          <p className="small muted">
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
    <div className="card stack">
      <div className="stack-sm">
        <h2 className="section-title">Connection required</h2>
        <p className="small muted">
          Enter a BasketballConnect organisation key and year reference ID to browse live ladders and
          fixtures.
        </p>
      </div>
      <button className="btn btn-dark" onClick={onOpenSettings}>
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
  onDivisionChange,
  variant = 'card'
}) {
  const containerClassName =
    variant === 'header' ? 'selectors selectors--header' : 'card selectors-card'

  return (
    <div className={containerClassName}>
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
  selectedTeamId,
  savedTeams,
  onToggleSaveTeam
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
    <div className="card table-card">
      <table className="ladder-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>F</th>
            <th>A</th>
            <th>Pts</th>
            <th>Form</th>
          </tr>
        </thead>
        <tbody>
          {ladderRows.map((team) => {
            const teamId = team.id ?? team.teamId ?? team.teamUniqueKey ?? team.teamName
            const isSelected = selectedTeamId != null && String(selectedTeamId) === String(teamId)
            const isSaved = savedTeams?.some((saved) => String(saved.id) === String(teamId))
            return (
              <tr
                key={teamId ?? team.name}
                className={`clickable-row${isSelected ? ' highlight' : ''}`}
                onClick={() => onSelectTeam(teamId)}
              >
                <td>{team.rk ?? team.rank ?? team.position ?? '–'}</td>
                <td>
                  <div className="team-cell">
                    <div className="team-details">
                      <span className="title team-name">{team.name ?? team.teamName ?? 'Unknown team'}</span>
                      <span className="small muted team-meta">{team.divisionName ?? team.poolName ?? ''}</span>
                    </div>
                    <button
                      className={`btn small save-button${isSaved ? ' is-active' : ''}`}
                      aria-pressed={isSaved}
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleSaveTeam?.({
                          ...team,
                          id: teamId
                        })
                      }}
                    >
                      {isSaved ? '★ Saved' : '☆ Save'}
                    </button>
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
        <div className="pill fixtures-pill">
          <span className="pill-actions">
            Viewing matches for <strong>{selectedTeamName}</strong>
            <button className="btn btn-ghost small" onClick={onClearTeam}>
              Clear
            </button>
          </span>
        </div>
      )}
      {results.length > 0 && (
        <section className="section">
          <h2 className="section-title">Results</h2>
          <ul className="list-reset match-list">
            {results.map((match) => (
              <MatchCard key={match.id} match={match} selectedTeamId={selectedTeamId} />
            ))}
          </ul>
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="section">
          <h2 className="section-title">Upcoming fixtures</h2>
          <ul className="list-reset match-list">
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
      <div className="card card-soft">
        <p className="small muted no-margin">
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
    <div className="stack stats-panel">
      <div className="card stack-lg">
        <div className="small muted">Last updated: {lastUpdatedText}</div>
        <div className="metric-grid">
          <div className="card metric-card">
            <div className="small muted">Upcoming games</div>
            <div className="title">{data.totals?.gamesUpcoming ?? '–'}</div>
          </div>
          <div className="card metric-card">
            <div className="small muted">Completed games</div>
            <div className="title">{data.totals?.gamesCompleted ?? '–'}</div>
          </div>
          <div className="card metric-card">
            <div className="small muted">Avg points (completed)</div>
            <div className="title">{data.pointsAvg != null ? data.pointsAvg : '–'}</div>
          </div>
        </div>
        <div className="stack-sm">
          <h2 className="section-title">Leaders</h2>
          {leaders.length === 0 ? (
            <p className="small muted no-margin">
              Leaderboard data is not currently available.
            </p>
          ) : (
            <ol className="leaders-list">
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

      <TopScorersView
        organisationKey={organisationKey}
        yearRefId={yearRefId}
        selectedCompetition={selectedCompetition}
        selectedDivisionId={selectedDivisionId}
      />
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

  const [savedTeams, setSavedTeams] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem('hoopsHub.savedTeams')
      if (!stored) return []
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter((team) => team && (team.id != null || team.teamId != null || team.teamUniqueKey != null))
        .map((team) => ({
          ...team,
          id: team.id != null ? team.id : team.teamId != null ? team.teamId : team.teamUniqueKey
        }))
    } catch (error) {
      console.warn('Failed to parse saved teams from storage', error)
      return []
    }
  })

  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [selectedRoundName, setSelectedRoundName] = useState('')
  const pendingSelectionRef = useRef({ divisionId: null, teamId: null })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedTeamId = window.localStorage.getItem('hoopsHub.selectedTeamId')
    if (storedTeamId) {
      setSelectedTeamId(storedTeamId)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedTeamId != null) {
      window.localStorage.setItem('hoopsHub.selectedTeamId', String(selectedTeamId))
    } else {
      window.localStorage.removeItem('hoopsHub.selectedTeamId')
    }
  }, [selectedTeamId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('hoopsHub.savedTeams', JSON.stringify(savedTeams))
    } catch (error) {
      console.warn('Failed to persist saved teams', error)
    }
  }, [savedTeams])

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

  const competitionsIndex = useMemo(() => {
    const map = new Map()
    for (const competition of competitions) {
      const name =
        competition.longName ||
        competition.name ||
        competition.competitionName ||
        competition.description ||
        ''
      const identifiers = [
        competition.id,
        competition.uniqueKey,
        competition.competitionId,
        competition.competitionUniqueKey
      ]
      for (const identifier of identifiers) {
        if (identifier == null) continue
        map.set(String(identifier), name)
      }
    }
    return map
  }, [competitions])

  const divisionsIndex = useMemo(() => {
    const map = new Map()
    for (const division of divisions) {
      if (division?.id == null) continue
      const name = division.name || division.longName || division.divisionName || ''
      map.set(String(division.id), name)
    }
    return map
  }, [divisions])

  useEffect(() => {
    if (!selectedCompetition) {
      setDivisions([])
      setSelectedDivisionId(null)
      pendingSelectionRef.current = { divisionId: null, teamId: null }
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
          const list = Array.isArray(data) ? data : []
          setDivisions(list)
          const pendingSelection = pendingSelectionRef.current || { divisionId: null, teamId: null }
          const pendingDivisionId = pendingSelection.divisionId
          let nextDivisionId = null
          if (pendingDivisionId != null) {
            const match = list.find((division) => Number(division.id) === Number(pendingDivisionId))
            if (match) {
              nextDivisionId = match.id
            }
          }
          if (nextDivisionId == null) {
            nextDivisionId = list.length > 0 ? list[0].id : null
          }
          setSelectedDivisionId(nextDivisionId)
          if (!pendingSelection.teamId) {
            setSelectedTeamId(null)
          }
          pendingSelectionRef.current = {
            divisionId: null,
            teamId: pendingSelection.teamId
          }
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
          setSelectedTeamId((current) => {
            const pendingSelection = pendingSelectionRef.current || { divisionId: null, teamId: null }
            const pendingTeamId = pendingSelection.teamId != null ? String(pendingSelection.teamId) : null
            if (
              pendingTeamId &&
              rows.some(
                (team) =>
                  String(team.id ?? team.teamId ?? team.teamUniqueKey ?? team.teamName) === pendingTeamId
              )
            ) {
              pendingSelectionRef.current = { divisionId: pendingSelection.divisionId, teamId: null }
              return pendingTeamId
            }
            const matchesCurrent =
              current != null &&
              rows.some((team) => String(team.id ?? team.teamId ?? team.teamUniqueKey) === String(current))
            if (matchesCurrent) {
              pendingSelectionRef.current = { divisionId: pendingSelection.divisionId, teamId: null }
              return current
            }
            if (typeof window !== 'undefined') {
              const storedTeamId = window.localStorage.getItem('hoopsHub.selectedTeamId')
              if (
                storedTeamId &&
                rows.some((team) => String(team.id ?? team.teamId ?? team.teamUniqueKey) === String(storedTeamId))
              ) {
                pendingSelectionRef.current = { divisionId: pendingSelection.divisionId, teamId: null }
                return storedTeamId
              }
            }
            pendingSelectionRef.current = { divisionId: pendingSelection.divisionId, teamId: null }
            return null
          })
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

  const ladderTeamMap = useMemo(() => {
    return new Map(
      (ladderRows || [])
        .map((team) => {
          const teamId = team.id ?? team.teamId ?? team.teamUniqueKey ?? team.teamName
          if (teamId == null) {
            return null
          }
          return [String(teamId), team]
        })
        .filter(Boolean)
    )
  }, [ladderRows])

  const competitionSelectionIdentifiers = useMemo(() => {
    const identifiers = new Set()
    if (selectedCompetitionId != null) {
      identifiers.add(String(selectedCompetitionId))
    }
    if (selectedCompetition) {
      const values = [
        selectedCompetition.id,
        selectedCompetition.uniqueKey,
        selectedCompetition.competitionId,
        selectedCompetition.competitionUniqueKey
      ]
      for (const value of values) {
        if (value != null) {
          identifiers.add(String(value))
        }
      }
    }
    return identifiers
  }, [selectedCompetition, selectedCompetitionId])

  const savedTeamsEnriched = useMemo(() => {
    return savedTeams
      .map((team) => {
        if (!team) return null
        const candidateId =
          team.id ?? team.teamId ?? team.teamUniqueKey ?? team.teamName ?? team.team?.id
        if (candidateId == null) {
          return null
        }
        const normalizedId = String(candidateId)
        const ladderTeam = ladderTeamMap.get(normalizedId)

        const competitionIdentifiers = []
        if (team.competitionId != null) {
          competitionIdentifiers.push(String(team.competitionId))
        }
        if (team.competitionUniqueKey != null) {
          competitionIdentifiers.push(String(team.competitionUniqueKey))
        }

        let competitionName = team.competitionName ?? null
        for (const identifier of competitionIdentifiers) {
          if (competitionsIndex.has(identifier)) {
            competitionName = competitionsIndex.get(identifier) || competitionName
            break
          }
        }

        const divisionIdentifiers = []
        if (team.divisionId != null) {
          divisionIdentifiers.push(String(team.divisionId))
        }

        let divisionName =
          team.divisionName ?? ladderTeam?.divisionName ?? ladderTeam?.poolName ?? null
        for (const identifier of divisionIdentifiers) {
          if (divisionsIndex.has(identifier)) {
            divisionName = divisionsIndex.get(identifier) || divisionName
            break
          }
        }

        return {
          ...team,
          id: normalizedId,
          name:
            ladderTeam?.name ??
            ladderTeam?.teamName ??
            ladderTeam?.team?.name ??
            team.name ??
            team.teamName ??
            `Team ${normalizedId}`,
          competitionName: competitionName || null,
          divisionName: divisionName || null
        }
      })
      .filter(Boolean)
  }, [savedTeams, ladderTeamMap, competitionsIndex, divisionsIndex])

  const savedTeamsForCurrentSelection = useMemo(() => {
    if (savedTeamsEnriched.length === 0) {
      return []
    }
    const divisionIdNumber = selectedDivisionId != null ? Number(selectedDivisionId) : NaN
    return savedTeamsEnriched.filter((team) => {
      if (!team) return false
      const teamId = team.id != null ? String(team.id) : null
      if (!teamId || !ladderTeamMap.has(teamId)) {
        return false
      }
      const teamCompetitionIdentifiers = new Set()
      if (team.competitionId != null) {
        teamCompetitionIdentifiers.add(String(team.competitionId))
      }
      if (team.competitionUniqueKey != null) {
        teamCompetitionIdentifiers.add(String(team.competitionUniqueKey))
      }
      const matchesCompetition = Array.from(teamCompetitionIdentifiers).some((identifier) =>
        competitionSelectionIdentifiers.has(identifier)
      )
      if (!matchesCompetition) {
        return false
      }
      if (Number.isNaN(divisionIdNumber)) {
        return true
      }
      if (team.divisionId != null && Number(team.divisionId) === divisionIdNumber) {
        return true
      }
      const ladderTeam = ladderTeamMap.get(teamId)
      if (ladderTeam?.divisionId != null && Number(ladderTeam.divisionId) === divisionIdNumber) {
        return true
      }
      return false
    })
  }, [
    savedTeamsEnriched,
    ladderTeamMap,
    competitionSelectionIdentifiers,
    selectedDivisionId
  ])

  const savedTeamIdsForCurrentSelection = useMemo(
    () => savedTeamsForCurrentSelection.map((team) => String(team.id)),
    [savedTeamsForCurrentSelection]
  )

  function normalizeTeamRecord(teamLike, extras = {}) {
    if (!teamLike) {
      return null
    }
    const candidateId =
      teamLike.id ??
      teamLike.teamId ??
      teamLike.teamUniqueKey ??
      teamLike.teamName ??
      teamLike.team?.id ??
      teamLike.team?.name
    if (candidateId == null) {
      return null
    }
    const id = String(candidateId)
    const record = {
      id,
      name:
        extras.name ??
        teamLike.name ??
        teamLike.teamName ??
        teamLike.team?.name ??
        `Team ${id}`,
      competitionId: extras.competitionId ?? null,
      competitionUniqueKey: extras.competitionUniqueKey ?? null,
      competitionName:
        extras.competitionName ??
        teamLike.competitionName ??
        teamLike.competitionLongName ??
        null,
      divisionId: extras.divisionId ?? null,
      divisionName:
        extras.divisionName ??
        teamLike.divisionName ??
        teamLike.poolName ??
        teamLike.team?.divisionName ??
        null
    }
    if (record.competitionId != null) {
      record.competitionId = String(record.competitionId)
    }
    if (record.competitionUniqueKey != null) {
      record.competitionUniqueKey = String(record.competitionUniqueKey)
    }
    if (record.divisionId != null) {
      const parsedDivision = Number(record.divisionId)
      record.divisionId = Number.isNaN(parsedDivision) ? null : parsedDivision
    }
    return record
  }

  function handleToggleSaveTeam(teamLike) {
    const divisionMeta = divisions.find(
      (division) => Number(division.id) === Number(selectedDivisionId)
    )
    const record = normalizeTeamRecord(teamLike, {
      competitionId: selectedCompetitionId != null ? String(selectedCompetitionId) : null,
      competitionUniqueKey:
        selectedCompetition?.uniqueKey != null
          ? String(selectedCompetition.uniqueKey)
          : null,
      competitionName:
        selectedCompetition?.longName ||
        selectedCompetition?.name ||
        selectedCompetition?.competitionName ||
        teamLike?.competitionName ||
        null,
      divisionId:
        selectedDivisionId != null
          ? Number(selectedDivisionId)
          : divisionMeta?.id != null
            ? Number(divisionMeta.id)
            : null,
      divisionName:
        divisionMeta?.name ||
        divisionMeta?.longName ||
        divisionMeta?.divisionName ||
        teamLike?.divisionName ||
        teamLike?.poolName ||
        null
    })
    if (!record) {
      return
    }
    setSavedTeams((prev) => {
      const existingIndex = prev.findIndex((item) => String(item.id) === record.id)
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = { ...prev[existingIndex], ...record }
        return next
      }
      return [...prev, record]
    })
  }

  function handleRemoveSavedTeam(teamId) {
    if (teamId == null) {
      return
    }
    const normalizedId = String(teamId)
    setSavedTeams((prev) => prev.filter((team) => String(team.id) !== normalizedId))
    setSelectedTeamId((current) => (String(current) === normalizedId ? null : current))
    const pendingSelection = pendingSelectionRef.current || { divisionId: null, teamId: null }
    if (pendingSelection.teamId != null && String(pendingSelection.teamId) === normalizedId) {
      pendingSelectionRef.current = {
        divisionId: pendingSelection.divisionId,
        teamId: null
      }
    }
  }

  function handleSelectSavedTeam(team) {
    if (!team) {
      return
    }
    const candidateId = team.id ?? team.teamId ?? team.teamUniqueKey ?? team.teamName
    if (candidateId == null) {
      return
    }
    const normalizedTeamId = String(candidateId)
    const competitionIdentifier =
      team.competitionId != null
        ? String(team.competitionId)
        : team.competitionUniqueKey != null
          ? String(team.competitionUniqueKey)
          : null
    const divisionIdentifier =
      team.divisionId != null && !Number.isNaN(Number(team.divisionId))
        ? Number(team.divisionId)
        : null
    pendingSelectionRef.current = {
      divisionId: divisionIdentifier,
      teamId: normalizedTeamId
    }
    if (competitionIdentifier != null) {
      setSelectedCompetitionId(competitionIdentifier)
    }
    if (divisionIdentifier != null) {
      setSelectedDivisionId(divisionIdentifier)
    }
    setSelectedTeamId(normalizedTeamId)
    setActiveTab('fixtures')
  }

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
    <div>
      <header className="brandbar">Hoops Hub</header>
      <nav className="tabbar" aria-label="Primary">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-dark' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="container">
        <header className="page-header">
          <div className="page-header__intro">
            <h1>Live Scores</h1>
            <p className="small muted">
              Browse ladders, fixtures, and player stats for BasketballConnect competitions, or
              configure your connection from the tabs above.
            </p>
          </div>

          {hasValidConfig && (
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
              variant="header"
            />
          )}
        </header>

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
          <div className="stack-lg">
          {(activeTab === 'ladder' || activeTab === 'fixtures') && (
            <>
              {savedTeamsForCurrentSelection.length > 0 && (
                <div
                  className="card"
                  style={{
                    padding: 12,
                    marginBottom: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap'
                    }}
                  >
                    <span className="small muted">Favourites</span>
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => setSelectedTeamId(null)}
                    >
                      Clear
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {savedTeamsForCurrentSelection.map((team) => {
                      const isSelected =
                        selectedTeamId != null &&
                        String(selectedTeamId) === String(team.id)
                      return (
                        <button
                          key={team.id}
                          type="button"
                          className="pill"
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? '#111' : undefined,
                            color: isSelected ? '#fff' : undefined
                          }}
                          onClick={() => setSelectedTeamId(String(team.id))}
                        >
                          {team.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <TeamSelector
                teams={ladderRows}
                selectedTeamId={selectedTeamId}
                onSelectTeam={(value) => setSelectedTeamId(value || null)}
                favourites={savedTeamIdsForCurrentSelection}
              />

              <SavedTeamsView
                savedTeams={savedTeamsEnriched}
                onSelectSavedTeam={handleSelectSavedTeam}
                onRemoveTeam={handleRemoveSavedTeam}
              />
            </>
          )}

          {activeTab === 'ladder' ? (
            <div>
              <p className="small muted helper-text">
                Click or tap a team to highlight it and filter fixtures. Use the ☆ Save button to store
                favourites for quick access later.
              </p>
              <LadderTable
                ladderRows={ladderRows}
                loading={ladderLoading}
                error={ladderError}
                onSelectTeam={(teamId) =>
                  setSelectedTeamId((current) => (String(current) === String(teamId) ? null : String(teamId)))
                }
                selectedTeamId={selectedTeamId}
                savedTeams={savedTeamsEnriched}
                onToggleSaveTeam={handleToggleSaveTeam}
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
          </div>
        ) : (
          <ConfigurationRequired onOpenSettings={() => setActiveTab('settings')} />
        )}
      </main>
    </div>
  )
}

function TeamSelector({ teams, selectedTeamId, onSelectTeam, favourites }) {
  const sortedTeams = useMemo(() => {
    return [...(teams || [])]
      .map((team) => ({
        id: team.id ?? team.teamId ?? team.teamUniqueKey ?? team.teamName,
        name: team.name ?? team.teamName ?? team.team?.name ?? 'Unknown team'
      }))
      .filter((team) => team.id != null && team.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [teams])

  const { favouriteTeamsSorted, otherTeams } = useMemo(() => {
    const favouriteIds = new Set((favourites || []).map((value) => String(value)))
    if (favouriteIds.size === 0) {
      return { favouriteTeamsSorted: [], otherTeams: sortedTeams }
    }

    const favouriteTeamsSorted = sortedTeams.filter((team) =>
      favouriteIds.has(String(team.id))
    )
    const otherTeams = sortedTeams.filter(
      (team) => !favouriteIds.has(String(team.id))
    )

    return { favouriteTeamsSorted, otherTeams }
  }, [favourites, sortedTeams])

  if (sortedTeams.length === 0) {
    return null
  }

  return (
    <div className="card team-selector">
      <label className="field">
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
        <span className="small muted field-description">
          Use the dropdown or click a team in the ladder to focus their fixtures.
        </span>
      </label>
    </div>
  )
}

function RoundSelector({ rounds, selectedRound, onSelectRound }) {
  if (!rounds || rounds.length === 0) {
    return null
  }

  return (
    <div className="card round-selector">
      <label className="field">
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
        <span className="small muted field-description">Filter fixtures by round.</span>
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
