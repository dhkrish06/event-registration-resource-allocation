'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

export default function MyRegistrations() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const load = useCallback(() => api('/api/registrations/mine').then((d) => setRows(d.registrations)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function cancel(id) {
    setErr(''); setMsg('');
    try { await api(`/api/events/${id}/register`, { method: 'DELETE' }); setMsg('Registration cancelled'); load(); }
    catch (e) { setErr(e.message); }
  }
  return (
    <>
      <h1>My Registrations</h1>
      {err && <div className="error">{err}</div>}
      {msg && <div className="success">{msg}</div>}
      <div className="scroll">
        <table>
          <thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Registered on</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.registration_id}>
                <td><Link href={`/events/${r.event_id}`}>{r.event_name}</Link></td>
                <td>{r.event_date}</td><td>{r.venue_name}</td><td>{r.registration_date}</td>
                <td><span className={`tag ${r.registration_status}`}>{r.registration_status}</span></td>
                <td>{r.registration_status !== 'Cancelled' && <button className="danger small" onClick={() => cancel(r.event_id)}>Cancel</button>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="muted">You have not registered for any events yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
