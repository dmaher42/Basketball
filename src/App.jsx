import React, { useEffect, useMemo, useState } from 'react'

const ORG_KEY = '3416293c-d99b-47de-8866-74a6138f0740'
const YEAR_REF_ID = 8
const API_BASE = 'https://api-basketball.squadi.com/livescores'
const IGNORE_STATUSES = encodeURIComponent(JSON.stringify([1]))

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
  const team1Selected = selectedTeamId != null && match.team1?.id === selectedTeamId
  const team2Selected = selectedTeamId != null && match.team2?.id === selectedTeamId
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
            const isSelected = selectedTeamId === team.id
            return (
              <tr
                key={team.id}
                className={isSelected ? 'highlight' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTeam(team.id)}
              >
                <td>{team.rk ?? team.rank ?? '–'}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="title" style={{ fontWeight: 600 }}>{team.name}</span>
                    <span className="small muted">{team.divisionName}</span>
                  </div>
                </td>
                <td>{team.P ?? '–'}</td>
                <td>{team.W ?? '–'}</td>
                <td>{team.L ?? '–'}</td>
                <td>{team.F ?? '–'}</td>
                <td>{team.A ?? '–'}</td>
                <td>{team.PTS ?? '–'}</td>
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
        const params = new URLSearchParams({
          divisionIds: String(selectedDivisionId),
          competitionKey: selectedCompetition.uniqueKey
        })
        const response = await fetch(`${API_BASE}/teams/ladder/v2?${params.toString()}`)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = await response.json()
        if (!cancelled) {
          const rows = Array.isArray(data?.ladders) ? data.ladders : []
          setLadderState({
            rows,
            lastResults: Array.isArray(data?.lastResults) ? data.lastResults : [],
            nextResults: Array.isArray(data?.nextResults) ? data.nextResults : []
          })
          setSelectedTeamId((current) => (rows.some((team) => team.id === current) ? current : null))
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
      lastResultsMap.set(item.teamId, item.last5 || [])
    }

    return (ladderState.rows || []).map((team) => ({
      ...team,
      form: (lastResultsMap.get(team.id) || []).map((entry) => {
        if (entry.code === 'WON') return 'W'
        if (entry.code === 'DRAWN') return 'D'
        return 'L'
      })
    }))
  }, [ladderState])

  const selectedTeam = useMemo(
    () => ladderRows.find((team) => team.id === selectedTeamId) || null,
    [ladderRows, selectedTeamId]
  )

  const filteredMatches = useMemo(() => {
    if (!selectedTeamId) {
      return matches
    }
    return matches.filter((match) => match.team1?.id === selectedTeamId || match.team2?.id === selectedTeamId)
  }, [matches, selectedTeamId])

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
            onSelectTeam={(teamId) => setSelectedTeamId((current) => (current === teamId ? null : teamId))}
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
          selectedTeamName={selectedTeam?.name}
          onClearTeam={() => setSelectedTeamId(null)}
        />
      )}

      {activeTab === 'player-stats' && (
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Player statistics</h2>
          <p className="muted">
            Player statistics for the selected division will appear here when available through the public API.
          </p>
        </div>
      )}
    </div>
  )
}
