'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, useMe } from '@/lib/client';

export default function Venues() {
  const me = useMe();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ venue_name: '', location: '', capacity: '' });
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/venues').then((d) => setRows(d.venues)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function run(fn) { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } }
  const admin = me?.role === 'admin';

  return (
    <>
      <h1>Venues</h1>
      {err && <div className="error">{err}</div>}
      <table>
        <thead><tr><th>Venue</th><th>Location</th><th>Capacity</th>{admin && <th></th>}</tr></thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.venue_id}>
              <td>{v.venue_name}</td><td>{v.location}</td><td>{v.capacity}</td>
              {admin && <td><button className="danger small" onClick={() => run(() => api(`/api/venues?id=${v.venue_id}`, { method: 'DELETE' }))}>Delete</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {admin && (
        <>
          <h2>Add venue</h2>
          <form className="row card" onSubmit={(e) => { e.preventDefault(); run(() => api('/api/venues', { method: 'POST', body: f })); }}>
            <label>Name<input required value={f.venue_name} onChange={(e) => setF({ ...f, venue_name: e.target.value })} /></label>
            <label>Location<input required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
            <label>Capacity<input type="number" min="1" required value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></label>
            <button type="submit">Add venue</button>
          </form>
        </>
      )}
    </>
  );
}
