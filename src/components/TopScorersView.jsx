import React from 'react'

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0
})

const averageFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})

function formatNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return numberFormatter.format(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }
  return '–'
}

function formatAverage(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return averageFormatter.format(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }
  return '–'
}

export default function TopScorersView({
  organisationKey,
  yearRefId,
  selectedCompetition,
  selectedDivisionId
}) {
  const [players, setPlayers] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)

  const competitionId = selectedCompetition?.id
  const competitionUniqueKey = selectedCompetition?.uniqueKey

  const isReady =
    organisationKey &&
    yearRefId != null &&
    competitionUniqueKey &&
    selectedDivisionId != null

  React.useEffect(() => {
    if (!isReady) {
      setPlayers([])
      setError(null)
      return
    }

    const params = new URLSearchParams({
      organisationKey,
      yearId: String(yearRefId),
      competitionUniqueKey,
      divisionId: String(selectedDivisionId)
    })

    if (competitionId != null) {
      params.set('competitionId', String(competitionId))
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/bc/playerScorers?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal
    })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}))
        if (!response.ok || !json.ok) {
          const message = json.error || json.message || `Request failed with status ${response.status}`
          throw new Error(message)
        }
        return json.players || []
      })
      .then((list) => {
        if (!controller.signal.aborted) {
          setPlayers(Array.isArray(list) ? list : [])
        }
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return
        }
        setError(fetchError?.message || 'Failed to load top scorers')
        setPlayers([])
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [competitionId, competitionUniqueKey, isReady, organisationKey, selectedDivisionId, yearRefId])

  if (!isReady) {
    return null
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>Loading top scorers…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p className="small" style={{ margin: 0, color: '#a00' }}>Error: {error}</p>
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>No scorer data available.</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 16, overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Top Scorers Leaderboard</h2>
        <span className="small muted">Sorted by total points</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #ddd' }}>Rank</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #ddd' }}>Player</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #ddd' }}>Team</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid #ddd' }}>Games</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid #ddd' }}>Total points</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid #ddd' }}>Avg points</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={`${player.playerName}-${player.teamName}-${index}`}>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>{index + 1}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>{player.playerName || 'Unknown'}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>{player.teamName || '–'}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{
                formatNumber(player.games)
              }</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{
                formatNumber(player.totalPoints)
              }</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{
                formatAverage(player.avgPoints)
              }</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
