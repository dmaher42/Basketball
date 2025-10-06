import React, { useEffect, useMemo, useState } from 'react'
import { Search, Star, StarOff, Trophy, Calendar, ListOrdered, Users, ChevronRight } from 'lucide-react'
import data from './data/mb_carnival.json'

function useLeagueMaps(league) {
  return useMemo(() => {
    if (!league) return { teamById: {}, ladderByTeam: {} }
    const teamById = Object.fromEntries(league.teams.map(t => [t.id, t]))
    const ladderByTeam = Object.fromEntries(league.ladder.map(row => [row.teamId, row]))
    return { teamById, ladderByTeam }
  }, [league])
}
function formatDate(iso) {
  try { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return iso }
}
function cls(...xs){ return xs.filter(Boolean).join(' ') }

export default function App(){
  const [query, setQuery] = useState('')
  const [favs, setFavs] = useState(() => new Set())
  const [league, setLeague] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState('eh-u12b2')
  const [activeTab, setActiveTab] = useState('schedule')

  useEffect(() => { setLeague(data) }, [])
  const { teamById } = useLeagueMaps(league || { teams:[], ladder:[] })
  const team = teamById[selectedTeamId]

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !league) return []
    const teamMatches = league.teams.map(t => ({ kind: 'team', leagueId: league.id, id: t.id, label: `${t.name} · ${league.name}` }))
      .filter(x => x.label.toLowerCase().includes(q))
    const leagueMatches = [{ kind: 'league', id: league.id, label: league.name }]
      .filter(x => x.label.toLowerCase().includes(q))
    return [...teamMatches.slice(0,8), ...leagueMatches]
  }, [query, league])

  function selectResult(r){
    if (r.kind === 'team'){ setSelectedTeamId(r.id); setActiveTab('schedule') }
    else { setActiveTab('ladder') }
    setQuery('')
  }
  function toggleFav(id){
    setFavs(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const fixtures = (league?.fixtures || []).filter(f => f.homeId === selectedTeamId || f.awayId === selectedTeamId)
    .sort((a,b) => a.date.localeCompare(b.date))

  return (
    <div>
      <header style={{position:'sticky',top:0,background:'rgba(255,255,255,.9)',backdropFilter:'blur(6px)',borderBottom:'1px solid #eee', zIndex:20}}>
        <div className="container" style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px'}}>
          <div className="pill" style={{background:'#111',color:'#fff',borderColor:'#111'}}>Hoops Hub</div>
          <div className="small muted">Murray Bridge Carnival · One search → everything</div>
        </div>
        <div className="container" style={{paddingBottom:12}}>
          <div className="search-wrap">
            <input className="search" placeholder="Search team or league (e.g. Eastern Hornets U12 Boys 2)…" value={query} onChange={e=>setQuery(e.target.value)} />
            <Search className="search-icon" size={18} />
            {query && (
              <div className="dropdown">
                {searchResults.length === 0 ? (
                  <div style={{padding:12}} className="small muted">No matches</div>
                ) : (
                  searchResults.map((r,i)=> (
                    <button key={i} onClick={()=>selectResult(r)} style={{width:'100%',textAlign:'left',padding:'12px 16px',background:'#fff',border:'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span className="small">{r.label}</span>
                      <ChevronRight size={16} color="#999" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container" style={{padding:'16px 16px 48px'}}>
        <div className="row" style={{marginBottom:12}}>
          <div>
            <div className="small muted">League</div>
            <div className="title">{league?.name}</div>
            <div className="small muted">{league?.org} · {league?.season}</div>
          </div>
        </div>

        {team && (
          <div className="card" style={{marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <div className="small muted">Team</div>
              <div className="title">{team.name}</div>
              <div className="small muted">{team.division} · {team.club}</div>
            </div>
            <button className="btn" onClick={()=>toggleFav(team.id)}>{favs.has(team.id) ? <Star size={16} /> : <StarOff size={16} />} {favs.has(team.id) ? 'Favourited' : 'Favourite'}</button>
          </div>
        )}

        <div className="tabs" style={{marginBottom:16}}>
          <button className={cls('btn', activeTab==='schedule' && 'btn-dark')} onClick={()=>setActiveTab('schedule')}><Calendar size={16}/> Schedule</button>
          <button className={cls('btn', activeTab==='ladder' && 'btn-dark')} onClick={()=>setActiveTab('ladder')}><ListOrdered size={16}/> Ladder</button>
          <button className={cls('btn', activeTab==='stats' && 'btn-dark')} onClick={()=>setActiveTab('stats')}><Users size={16}/> Player stats</button>
          <button className={cls('btn', activeTab==='draw' && 'btn-dark')} onClick={()=>setActiveTab('draw')}><Trophy size={16}/> League draw</button>
        </div>

        {activeTab==='schedule' && (
          <section>
            {fixtures.map(g => <GameCard key={g.id} g={g} teamById={teamById} highlightTeamId={selectedTeamId} />)}
            {fixtures.length===0 && <Empty title="No games found" subtitle="Try selecting a different team or check the league draw."/>}
          </section>
        )}

        {activeTab==='ladder' && (<LadderTable league={league} teamById={teamById} highlightTeamId={selectedTeamId}/>)}
        {activeTab==='stats' && (<PlayerStatsTable league={league} teamId={selectedTeamId} teamById={teamById}/>)}
        {activeTab==='draw' && (
          <section>
            {(league?.fixtures||[]).sort((a,b)=>a.date.localeCompare(b.date)).map(g=> <GameCard key={g.id} g={g} teamById={teamById}/>)}
          </section>
        )}

        <div className="small muted" style={{marginTop:24}}>Mock data shown from <code>/src/data/mb_carnival.json</code>. Swap with real JSON later.</div>
      </main>
    </div>
  )
}

function GameCard({ g, teamById, highlightTeamId }){
  const home = teamById[g.homeId]
  const away = teamById[g.awayId]
  const isFinal = g.status === 'Final' && g.score
  const badge = isFinal ? (<span className="badge badge-dark">Final</span>) : (<span className="badge badge-light">{g.status}</span>)
  const homeBold = highlightTeamId && home?.id === highlightTeamId
  const awayBold = highlightTeamId && away?.id === highlightTeamId
  return (
    <div className="card" style={{marginBottom:12}}>
      <div className="row small muted" style={{marginBottom:6}}>
        <div>Round {g.round} · {formatDate(g.date)} · {g.time}</div>
        <div>{badge}</div>
      </div>
      <div className="row">
        <div style={{flex:1}}>
          <div className={cls(homeBold && 'title')}>{home?.name || g.homeId}</div>
          <div className={cls(awayBold && 'title')}>{away?.name || g.awayId}</div>
        </div>
        <div style={{textAlign:'right'}}>
          {isFinal ? (<div className="title">{g.score.home} – {g.score.away}</div>) : (<div className="small muted">{g.venue}</div>)}
        </div>
      </div>
    </div>
  )
}

function LadderTable({ league, teamById, highlightTeamId }){
  if (!league) return null
  const rows = [...league.ladder].sort((a,b)=> b.pts - a.pts)
  return (
    <div className="card" style={{padding:0, overflowX:'auto'}}>
      <table>
        <thead>
          <tr><th>Pos</th><th style={{textAlign:'left'}}>Team</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Pts</th></tr>
        </thead>
        <tbody>
          {rows.map((r, idx)=>{
            const team = teamById[r.teamId]
            const hi = team?.id === highlightTeamId
            return (
              <tr key={r.teamId} className={hi ? 'highlight' : ''}>
                <td>{idx+1}</td>
                <td style={{textAlign:'left'}}>{team?.name || r.teamId}</td>
                <td style={{textAlign:'center'}}>{r.played}</td>
                <td style={{textAlign:'center'}}>{r.won}</td>
                <td style={{textAlign:'center'}}>{r.lost}</td>
                <td style={{textAlign:'center'}}>{r.ptsFor}</td>
                <td style={{textAlign:'center'}}>{r.ptsAg}</td>
                <td style={{textAlign:'center', fontWeight:700}}>{r.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PlayerStatsTable({ league, teamId, teamById }){
  if (!league || !teamId) return null
  const rows = (league.playerStats[teamId] || []).slice().sort((a,b)=> b.ppg - a.ppg)
  const team = teamById[teamId]
  return (
    <div className="card">
      <div className="row" style={{marginBottom:8}}>
        <div>
          <div className="small muted">Player statistics</div>
          <div className="title">{team?.name}</div>
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table>
          <thead>
            <tr><th style={{textAlign:'left'}}>Player</th><th>GP</th><th>PTS</th><th>PPG</th></tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id}>
                <td style={{textAlign:'left'}}>{p.name}</td>
                <td style={{textAlign:'center'}}>{p.gp}</td>
                <td style={{textAlign:'center'}}>{p.pts}</td>
                <td style={{textAlign:'center'}}>{p.ppg.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Empty({ title, subtitle }){
  return (
    <div className="card" style={{textAlign:'center'}}>
      <div className="title" style={{marginBottom:6}}>{title}</div>
      <div className="small muted">{subtitle}</div>
    </div>
  )
}
