import React, { useEffect, useMemo, useState } from 'react'
import carnivalData from './data/mb_carnival.json'

const DEFAULT_ORG_KEY = '3416293c-d99b-47de-8866-74a6138f0740'
const DEFAULT_YEAR_REF_ID = 8
const API_BASE = 'https://api-basketball.squadi.com/livescores'
const LADDER_BASE_URL = 'https://registration.basketballconnect.com/livescorePublicLadder'
const IGNORE_STATUSES = encodeURIComponent(JSON.stringify([1]))

const CONTEXTS_STORAGE_KEY = 'bc:tournamentContexts'
const ACTIVE_CONTEXT_STORAGE_KEY = 'bc:activeTournamentContextId'
const DEFAULT_CONTEXT = {
  id: 'default',
  label: 'Murray Bridge Carnival',
  orgKey: DEFAULT_ORG_KEY,
  yearRefId: DEFAULT_YEAR_REF_ID
}

const TABS = [
  { id: 'ladder', label: 'Ladder' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'player-stats', label: 'Player Stats' }
]

function generateContextId() {
  return `ctx-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}

function sanitizeContexts(contexts) {
  if (!Array.isArray(contexts)) return [DEFAULT_CONTEXT]
  const map = new Map()
  for (const context of contexts) {
    if (!context || typeof context !== 'object') continue
    const orgKey = typeof context.orgKey === 'string' ? context.orgKey.trim() : ''
    const yearRefId = Number(context.yearRefId)
    if (!orgKey || Number.isNaN(yearRefId)) continue
    const combinationKey = `${orgKey}-${yearRefId}`
    const id = typeof context.id === 'string' && context.id ? context.id : `${orgKey}-${yearRefId}`
    const label = typeof context.label === 'string' && context.label.trim()
      ? context.label.trim()
      : `${orgKey.slice(0, 8)}… (${yearRefId})`
    const normalizedContext = { id, label, orgKey, yearRefId }
    if (map.has(combinationKey)) {
      map.delete(combinationKey)
    }
    map.set(combinationKey, normalizedContext)
  }
  const orderedContexts = []
  const idSet = new Set()
  for (const context of map.values()) {
    let contextId = context.id
    while (idSet.has(contextId)) {
      contextId = `${contextId}-${Math.random().toString(36).slice(2, 6)}`
    }
    idSet.add(contextId)
    orderedContexts.push({ ...context, id: contextId })
  }

  const otherContexts = orderedContexts.filter(
    (context) =>
      context.id !== DEFAULT_CONTEXT.id &&
      (context.orgKey !== DEFAULT_CONTEXT.orgKey || context.yearRefId !== DEFAULT_CONTEXT.yearRefId)
  )

  return [DEFAULT_CONTEXT, ...otherContexts]
}

function loadStoredContexts() {
  if (typeof window === 'undefined') return [DEFAULT_CONTEXT]
  try {
    const stored = window.localStorage.getItem(CONTEXTS_STORAGE_KEY)
    if (!stored) return [DEFAULT_CONTEXT]
    const parsed = JSON.parse(stored)
    return sanitizeContexts(parsed)
  } catch (error) {
    console.warn('Failed to load stored tournament contexts', error)
    return [DEFAULT_CONTEXT]
  }
}

function loadStoredActiveContextId(contexts) {
  if (typeof window === 'undefined') return contexts[0]?.id ?? DEFAULT_CONTEXT.id
  try {
    const stored = window.localStorage.getItem(ACTIVE_CONTEXT_STORAGE_KEY)
    if (stored && contexts.some((context) => context.id === stored)) {
      return stored
    }
  } catch (error) {
    console.warn('Failed to load active tournament context', error)
  }
  return contexts[0]?.id ?? DEFAULT_CONTEXT.id
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

function TournamentManager({
  contexts,
  activeContextId,
  onSelectContext,
  onAddContext,
  onRemoveContext
}) {
  const [label, setLabel] = useState('')
  const [orgKey, setOrgKey] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  const orderedContexts = contexts

  async function handleSearch(event) {
    event.preventDefault()
    const trimmedOrgKey = orgKey.trim()
    const parsedYear = Number(year)
    if (!trimmedOrgKey || Number.isNaN(parsedYear)) {
      setError('Enter a valid organisation key and year.')
      setPreview(null)
      return
    }

    setLoading(true)
    setError(null)
    setPreview(null)

    try {
      const response = await fetch(
        `${API_BASE}/competitions/list?organisationUniqueKey=${encodeURIComponent(trimmedOrgKey)}&yearRefId=${parsedYear}`
      )
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      const data = await response.json()
      if (!Array.isArray(data) || data.length === 0) {
        setError('No competitions found for that organisation and year.')
        setPreview(null)
        return
      }
      const suggestedLabel = label.trim() || data[0].longName || data[0].name || 'Tournament'
      setPreview({
        label: suggestedLabel,
        orgKey: trimmedOrgKey,
        yearRefId: parsedYear,
        competitionCount: data.length
      })
      setError(null)
    } catch (searchError) {
      setError(searchError.message || 'Search failed. Please try again.')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  function handleAddPreview() {
    if (!preview) return
    const newContext = onAddContext({
      label: preview.label,
      orgKey: preview.orgKey,
      yearRefId: preview.yearRefId
    })
    if (newContext) {
      setLabel('')
      setOrgKey('')
      setYear('')
      setPreview(null)
      setError(null)
    }
  }

  const activeContext = contexts.find((context) => context.id === activeContextId)

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Tournaments</h2>

      <div className="field" style={{ marginBottom: 16 }}>
        <label className="field-label" htmlFor="active-tournament">
          Active tournament
        </label>
        <select
          id="active-tournament"
          className="field-input"
          value={activeContextId ?? ''}
          onChange={(event) => onSelectContext(event.target.value)}
        >
          {orderedContexts.map((context) => (
            <option key={context.id} value={context.id}>
              {context.label} · {context.yearRefId}
            </option>
          ))}
        </select>
        <p className="field-help">
          {activeContext
            ? `Organisation key: ${activeContext.orgKey}`
            : 'Select a tournament to load its competitions.'}
        </p>
        {activeContext && activeContext.id !== DEFAULT_CONTEXT.id && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onRemoveContext(activeContext.id)}
            style={{ marginTop: 8 }}
          >
            Remove this tournament
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="field" style={{ marginBottom: 0 }}>
        <h3 style={{ margin: '16px 0 8px' }}>Find another tournament</h3>
        <label className="field-label" htmlFor="tournament-label">
          Display name (optional)
        </label>
        <input
          id="tournament-label"
          className="field-input"
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="e.g. State Championships"
        />

        <label className="field-label" htmlFor="tournament-org" style={{ marginTop: 12 }}>
          Organisation key
        </label>
        <input
          id="tournament-org"
          className="field-input"
          type="text"
          value={orgKey}
          onChange={(event) => setOrgKey(event.target.value)}
          placeholder="Paste the BasketballConnect organisation key"
          required
        />

        <label className="field-label" htmlFor="tournament-year" style={{ marginTop: 12 }}>
          Year reference ID
        </label>
        <input
          id="tournament-year"
          className="field-input"
          type="number"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          placeholder="e.g. 8"
          required
          min="1"
        />

        <button type="submit" className="btn btn-dark" style={{ marginTop: 16 }} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>

        {error && <p className="field-help" style={{ color: '#c00' }}>{error}</p>}
        {preview && !error && (
          <div className="card" style={{ marginTop: 16, padding: 12, background: '#f8fafc' }}>
            <p style={{ margin: '0 0 8px' }}>
              Found {preview.competitionCount} competitions for this tournament.
            </p>
            <button type="button" className="btn" onClick={handleAddPreview}>
              Add “{preview.label}”
            </button>
          </div>
        )}
      </form>
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

  const [tournamentContexts, setTournamentContexts] = useState(() => loadStoredContexts())
  const [activeContextId, setActiveContextId] = useState(() =>
    loadStoredActiveContextId(loadStoredContexts())
  )

  useEffect(() => {
    setTournamentContexts((contexts) => sanitizeContexts(contexts))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(CONTEXTS_STORAGE_KEY, JSON.stringify(tournamentContexts))
    } catch (error) {
      console.warn('Failed to persist tournament contexts', error)
    }
  }, [tournamentContexts])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (activeContextId) {
        window.localStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, activeContextId)
      } else {
        window.localStorage.removeItem(ACTIVE_CONTEXT_STORAGE_KEY)
      }
    } catch (error) {
      console.warn('Failed to persist active tournament context', error)
    }
  }, [activeContextId])

  useEffect(() => {
    if (!tournamentContexts.some((context) => context.id === activeContextId)) {
      setActiveContextId(tournamentContexts[0]?.id ?? DEFAULT_CONTEXT.id)
    }
  }, [tournamentContexts, activeContextId])

  const activeContext = useMemo(
    () =>
      tournamentContexts.find((context) => context.id === activeContextId) ??
      tournamentContexts[0] ??
      DEFAULT_CONTEXT,
    [tournamentContexts, activeContextId]
  )

  const organisationKey = activeContext?.orgKey ?? DEFAULT_ORG_KEY
  const yearRefId = activeContext?.yearRefId ?? DEFAULT_YEAR_REF_ID

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

  function handleSelectContext(contextId) {
    if (tournamentContexts.some((context) => context.id === contextId)) {
      setActiveContextId(contextId)
    }
  }

  function handleAddContext({ label, orgKey, yearRefId }) {
    const trimmedOrgKey = typeof orgKey === 'string' ? orgKey.trim() : ''
    const numericYear = Number(yearRefId)
    if (!trimmedOrgKey || Number.isNaN(numericYear)) {
      return null
    }
    const normalizedLabel = label && label.trim()
      ? label.trim()
      : `${trimmedOrgKey.slice(0, 8)}… (${numericYear})`
    const newContext = {
      id: generateContextId(),
      label: normalizedLabel,
      orgKey: trimmedOrgKey,
      yearRefId: numericYear
    }
    setTournamentContexts((previous) => sanitizeContexts([...previous, newContext]))
    setActiveContextId(newContext.id)
    return newContext
  }

  function handleRemoveContext(contextId) {
    if (contextId === DEFAULT_CONTEXT.id) return
    setTournamentContexts((previous) =>
      sanitizeContexts(previous.filter((context) => context.id !== contextId))
    )
  }

  useEffect(() => {
    setCompetitions([])
    setSelectedCompetitionId(null)
    setDivisions([])
    setSelectedDivisionId(null)
    setSelectedTeamId(null)
  }, [organisationKey, yearRefId])

  useEffect(() => {
    let cancelled = false

    async function fetchCompetitions() {
      setCompetitionLoading(true)
      setCompetitionError(null)
      try {
        const response = await fetch(
          `${API_BASE}/competitions/list?organisationUniqueKey=${organisationKey}&yearRefId=${yearRefId}`
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

    if (organisationKey && yearRefId) {
      fetchCompetitions()
    }

    return () => {
      cancelled = true
    }
  }, [organisationKey, yearRefId])

  const selectedCompetition = useMemo(
    () => competitions.find((competition) => competition.id === selectedCompetitionId) || null,
    [competitions, selectedCompetitionId]
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

  const playerStatsIndex = useMemo(() => buildPlayerStatsIndex(carnivalData), [])

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

      <TournamentManager
        contexts={tournamentContexts}
        activeContextId={activeContext?.id}
        onSelectContext={handleSelectContext}
        onAddContext={handleAddContext}
        onRemoveContext={handleRemoveContext}
      />

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
          selectedTeamId={selectedTeamId}
          selectedTeam={selectedTeam}
          selectedTeamStats={selectedTeamStats}
          leaders={playerStatsIndex.leaders}
          statsSourceName={carnivalData?.name}
          hasStats={playerStatsIndex.hasData}
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
  selectedTeamId,
  selectedTeam,
  selectedTeamStats,
  leaders,
  statsSourceName,
  hasStats
}) {
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

  return (
    <div className="card" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Player statistics</h2>

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
                <h3 style={{ marginBottom: 8, marginTop: 0 }}>Carnival leaders</h3>
                <LeadersTable players={topPlayers} />
              </div>
            )}
          </div>
        )
      ) : topPlayers.length > 0 ? (
        <div>
          <p className="muted">
            Select a team from the ladder or dropdown to view detailed player numbers. In the meantime, here are the current
            carnival leaders.
          </p>
          <LeadersTable players={topPlayers} />
        </div>
      ) : (
        <p className="muted">Player statistics will appear here once data has been provided for this competition.</p>
      )}

      {hasStats && (
        <p className="small muted" style={{ marginTop: 16 }}>
          Data source: {statsSourceName || 'sample carnival data'}. Replace <code>src/data/mb_carnival.json</code> to update the
          statistics with your own feed.
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

function buildPlayerStatsIndex(data) {
  const empty = {
    byId: new Map(),
    byName: new Map(),
    leaders: [],
    hasData: false
  }

  if (!data || typeof data !== 'object') {
    return empty
  }

  const playerStats = data.playerStats && typeof data.playerStats === 'object' ? data.playerStats : null
  if (!playerStats) {
    return empty
  }

  const teams = Array.isArray(data.teams) ? data.teams : []
  const teamMetaById = new Map()
  for (const team of teams) {
    const identifier = team.id ?? team.teamId ?? team.teamUniqueKey ?? team.name
    if (identifier != null) {
      teamMetaById.set(String(identifier), team)
    }
  }

  for (const [teamKey, players] of Object.entries(playerStats)) {
    const teamId = String(teamKey)
    const normalizedPlayers = Array.isArray(players)
      ? players.map((player) => ({
          ...player,
          gp: toNumber(player.gp),
          pts: toNumber(player.pts),
          ppg: toNumber(player.ppg)
        }))
      : []

    if (normalizedPlayers.length > 0) {
      empty.hasData = true
    }

    const teamMeta = teamMetaById.get(teamId) || null
    const entry = { teamId, team: teamMeta, players: normalizedPlayers }

    empty.byId.set(teamId, entry)

    const normalizedTeamName = normalizeTeamName(teamMeta?.name)
    if (normalizedTeamName) {
      empty.byName.set(normalizedTeamName, entry)
    }

    for (const player of normalizedPlayers) {
      empty.leaders.push({
        ...player,
        teamId,
        teamName: teamMeta?.name ?? teamId,
        division: teamMeta?.division ?? teamMeta?.divisionName ?? null
      })
    }
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
