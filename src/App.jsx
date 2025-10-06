import React, { useEffect, useState } from 'react'

const API_URL = 'https://api-basketball.squadi.com/livescores/round/matches?competitionId=1944&divisionId=16238&teamIds=&ignoreStatuses=%5B1%5D'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function fetchMatches() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(API_URL)
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
          setError(err.message || 'Failed to load matches')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchMatches()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="container" style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Live Scores</h1>
        <p className="small muted">Latest results from competition 1944 · division 16238</p>
      </header>

      {loading && <p>Loading matches…</p>}
      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 16, color: '#d00', background: '#fee', border: '1px solid #f99' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <p>No matches available.</p>
      )}

      {!loading && !error && matches.length > 0 && (
        <ul style={{ padding: 0, margin: 0 }}>
          {matches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </ul>
      )}
    </div>
  )
}
