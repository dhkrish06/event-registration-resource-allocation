'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, useMe } from '@/lib/client';

export default function Resources() {
  const me = useMe();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ resource_name: '', resource_type: '', available_quantity: 0 });
  const [add, setAdd] = useState({});
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/resources').then((d) => setRows(d.resources)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function run(fn) { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } }
  const admin = me?.role === 'admin';

  return (
    <>
      <h1>Resources</h1>
      {err && <div className="error">{err}</div>}
      <div className="scroll">
        <table>
          <thead><tr><th>Resource</th><th>Type</th><th>Total</th><th>Allocated</th><th>Available</th>{admin && <th>Admin actions</th>}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.resource_id}>
                <td>{r.resource_name}</td><td>{r.resource_type}</td><td>{r.total_quantity}</td><td>{r.allocated_quantity}</td><td>{r.available_quantity}</td>
                {admin && (
                  <td>
                    <input type="number" style={{ width: 70 }} placeholder="+qty" value={add[r.resource_id] || ''} onChange={(e) => setAdd({ ...add, [r.resource_id]: e.target.value })} />{' '}
                    <button className="small" onClick={() => run(() => api('/api/resources', { method: 'PUT', body: { resource_id: r.resource_id, add: add[r.resource_id] } }))}>Restock</button>{' '}
                    <button className="danger small" onClick={() => run(() => api(`/api/resources?id=${r.resource_id}`, { method: 'DELETE' }))}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {admin && (
        <>
          <h2>Add resource</h2>
          <form className="row card" onSubmit={(e) => { e.preventDefault(); run(() => api('/api/resources', { method: 'POST', body: f })); }}>
            <label>Name<input required value={f.resource_name} onChange={(e) => setF({ ...f, resource_name: e.target.value })} /></label>
            <label>Type<input required value={f.resource_type} onChange={(e) => setF({ ...f, resource_type: e.target.value })} /></label>
            <label>Quantity<input type="number" min="0" required value={f.available_quantity} onChange={(e) => setF({ ...f, available_quantity: e.target.value })} /></label>
            <button type="submit">Add resource</button>
          </form>
        </>
      )}
    </>
  );
}
