import React from 'react'

export default function SavedTeamsView({ savedTeams, onSelectSavedTeam, onRemoveTeam }) {
  if (!savedTeams || savedTeams.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>My Teams</h2>
        <p className="small muted" style={{ marginTop: 8 }}>
          No saved teams yet. Click the <span aria-hidden="true">☆</span> Save button in the ladder to store
          your favourites.
        </p>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h2 style={{ fontSize: 18, margin: 0 }}>My Teams</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {savedTeams.map((team) => (
          <li
            key={team.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'space-between'
            }}
          >
            <span>
              <span className="title" style={{ fontWeight: 600 }}>{team.name}</span>
              <span className="small muted" style={{ marginLeft: 8 }}>
                {team.competitionName ? `· ${team.competitionName}` : ''}
                {team.divisionName ? ` · ${team.divisionName}` : ''}
              </span>
            </span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button className="btn small" onClick={() => onSelectSavedTeam?.(team)}>
                Open
              </button>
              <button className="btn small" onClick={() => onRemoveTeam?.(team.id)}>
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
