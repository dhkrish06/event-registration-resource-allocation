'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, useMe } from '@/lib/client';

export default function Dashboard() {
  const me = useMe();
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [mine, setMine] = useState({});
  const [filters, setFilters] = useState({ q: '', from: '', to: '', venue: '' });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
      setEvents((await api('/api/events?' + p)).events);
    } catch (e) { setErr(e.message); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/api/venues').then((d) => setVenues(d.venues)).catch(() => {}); }, []);
  useEffect(() => {
    if (me?.role === 'student')
      api('/api/registrations/mine').then((d) =>
        setMine(Object.fromEntries(d.registrations.map((r) => [r.event_id, r.registration_status])))).catch(() => {});
  }, [me, events]);

  async function register(id) {
    setErr(''); setMsg('');
    try { const r = await api(`/api/events/${id}/register`, { method: 'POST' }); setMsg(`Status: ${r.status}`); load(); }
    catch (e) { setErr(e.message); }
  }

  const totalReg = events.reduce((s, e) => s + e.registered_count, 0);
  const totalWait = events.reduce((s, e) => s + e.waitlisted_count, 0);

  return (
    <>
      <h1>Events Dashboard</h1>
      <div className="stats">
        <div className="stat"><b>{events.length}</b>Events shown</div>
        <div className="stat"><b>{totalReg}</b>Registrations</div>
        <div className="stat"><b>{totalWait}</b>On waitlist</div>
      </div>

      <div className="card">
        <div className="row">
          <label>Search<input placeholder="Event name" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></label>
          <label>From<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
          <label>To<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
          <label>Venue
            <select value={filters.venue} onChange={(e) => setFilters({ ...filters, venue: e.target.value })}>
              <option value="">All</option>
              {venues.map((v) => <option key={v.venue_id} value={v.venue_id}>{v.venue_name}</option>)}
            </select>
          </label>
          <button className="secondary" onClick={() => setFilters({ q: '', from: '', to: '', venue: '' })}>Clear</button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="scroll">
        <table>
          <thead><tr><th>Event</th><th>Date</th><th>Time</th><th>Venue</th><th>Organizer</th><th>Seats left</th><th>Waitlist</th><th></th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.event_id}>
                <td><Link href={`/events/${e.event_id}`}>{e.event_name}</Link></td>
                <td>{e.event_date}</td>
                <td>{e.start_time.slice(0, 5)} - {e.end_time.slice(0, 5)}</td>
                <td>{e.venue_name}</td>
                <td>{e.organizer_name}</td>
                <td>{e.seats_left} / {e.capacity}</td>
                <td>{e.waitlisted_count}</td>
                <td>
                  {me?.role === 'student' && (mine[e.event_id] && mine[e.event_id] !== 'Cancelled'
                    ? <span className={`tag ${mine[e.event_id]}`}>{mine[e.event_id]}</span>
                    : <button className="small" onClick={() => register(e.event_id)}>{e.seats_left > 0 ? 'Register' : 'Join waitlist'}</button>)}
                </td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={8} className="muted">No events match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
