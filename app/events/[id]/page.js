'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, useMe } from '@/lib/client';

export default function EventDetail() {
  const { id } = useParams();
  const router = useRouter();
  const me = useMe();
  const [data, setData] = useState(null);
  const [resources, setResources] = useState([]);
  const [venues, setVenues] = useState([]);
  const [fb, setFb] = useState({ items: [], avg: null, count: 0 });
  const [alloc, setAlloc] = useState({ resource_id: '', quantity: 1 });
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/events/${id}`));
      setFb(await api(`/api/events/${id}/feedback`));
      setResources((await api('/api/resources')).resources);
    } catch (e) { setErr(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/api/venues').then((d) => setVenues(d.venues)).catch(() => {}); }, []);

  async function act(fn, ok) {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); await load(); } catch (e) { setErr(e.message); }
  }

  if (!data) return <>{err ? <div className="error">{err}</div> : <p>Loading...</p>}</>;
  const { event: ev, allocations, registrations, canManage, myStatus } = data;
  const active = myStatus && myStatus !== 'Cancelled';

  return (
    <>
      <h1>{ev.event_name}</h1>
      {err && <div className="error">{err}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="card">
        <p><b>Date:</b> {ev.event_date} &nbsp; <b>Time:</b> {ev.start_time.slice(0, 5)} - {ev.end_time.slice(0, 5)}</p>
        <p><b>Venue:</b> {ev.venue_name} ({ev.location}) &nbsp; <b>Organizer:</b> {ev.organizer_name}</p>
        <p><b>Seats:</b> {ev.registered_count} registered / {ev.capacity} capacity ({ev.seats_left} left), {ev.waitlisted_count} on waitlist</p>
        {me?.role === 'student' && (active
          ? <><span className={`tag ${myStatus}`}>{myStatus}</span>{' '}
              <button className="danger small" onClick={() => act(() => api(`/api/events/${id}/register`, { method: 'DELETE' }), 'Registration cancelled')}>Cancel registration</button></>
          : <button onClick={() => act(() => api(`/api/events/${id}/register`, { method: 'POST' }), 'Registration submitted')}>
              {ev.seats_left > 0 ? 'Register' : 'Join waitlist'}</button>)}
        {canManage && (
          <div className="row" style={{ marginTop: 12 }}>
            <button className="secondary small" onClick={() => setEdit(edit ? null : { event_name: ev.event_name, event_date: ev.event_date, start_time: ev.start_time.slice(0, 5), end_time: ev.end_time.slice(0, 5), venue_id: ev.venue_id })}>
              {edit ? 'Close editor' : 'Edit event'}</button>
            <button className="danger small" onClick={() => confirm('Delete this event?') && act(async () => { await api(`/api/events/${id}`, { method: 'DELETE' }); router.push('/'); }, 'Deleted')}>Delete event</button>
          </div>
        )}
        {edit && (
          <form className="row" onSubmit={(e) => { e.preventDefault(); act(() => api(`/api/events/${id}`, { method: 'PUT', body: edit }), 'Event updated'); }}>
            <label>Name<input required value={edit.event_name} onChange={(e) => setEdit({ ...edit, event_name: e.target.value })} /></label>
            <label>Date<input type="date" required value={edit.event_date} onChange={(e) => setEdit({ ...edit, event_date: e.target.value })} /></label>
            <label>Start<input type="time" required value={edit.start_time} onChange={(e) => setEdit({ ...edit, start_time: e.target.value })} /></label>
            <label>End<input type="time" required value={edit.end_time} onChange={(e) => setEdit({ ...edit, end_time: e.target.value })} /></label>
            <label>Venue
              <select value={edit.venue_id} onChange={(e) => setEdit({ ...edit, venue_id: e.target.value })}>
                {venues.map((v) => <option key={v.venue_id} value={v.venue_id}>{v.venue_name}</option>)}
              </select>
            </label>
            <button type="submit">Save changes</button>
          </form>
        )}
      </div>

      <h2>Allocated Resources</h2>
      <div className="scroll">
        <table>
          <thead><tr><th>Resource</th><th>Type</th><th>Quantity</th><th>Allocated on</th>{canManage && <th></th>}</tr></thead>
          <tbody>
            {allocations.map((a) => (
              <tr key={a.allocation_id}>
                <td>{a.resource_name}</td><td>{a.resource_type}</td><td>{a.quantity}</td><td>{a.allocation_date}</td>
                {canManage && <td><button className="danger small" onClick={() => act(() => api(`/api/events/${id}/resources?allocationId=${a.allocation_id}`, { method: 'DELETE' }), 'Allocation removed')}>Remove</button></td>}
              </tr>
            ))}
            {!allocations.length && <tr><td colSpan={5} className="muted">No resources allocated yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {canManage && (
        <form className="row card" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); act(() => api(`/api/events/${id}/resources`, { method: 'POST', body: alloc }), 'Resource allocated'); }}>
          <label>Resource
            <select required value={alloc.resource_id} onChange={(e) => setAlloc({ ...alloc, resource_id: e.target.value })}>
              <option value="">Select</option>
              {resources.map((r) => <option key={r.resource_id} value={r.resource_id}>{r.resource_name} ({r.available_quantity} available)</option>)}
            </select>
          </label>
          <label>Quantity<input type="number" min="1" required value={alloc.quantity} onChange={(e) => setAlloc({ ...alloc, quantity: e.target.value })} /></label>
          <button type="submit">Allocate</button>
        </form>
      )}

      {canManage && (
        <>
          <h2>Registrations</h2>
          <div className="scroll">
            <table>
              <thead><tr><th>Student</th><th>Email</th><th>Department</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.registration_id}>
                    <td>{r.student_name}</td><td>{r.email}</td><td>{r.department}</td><td>{r.registration_date}</td>
                    <td><span className={`tag ${r.registration_status}`}>{r.registration_status}</span></td>
                  </tr>
                ))}
                {!registrations.length && <tr><td colSpan={5} className="muted">No registrations yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Feedback {fb.avg !== null && <span className="muted">(average {fb.avg} / 5 from {fb.count})</span>}</h2>
      {me?.role === 'student' && myStatus === 'Registered' && (
        <form className="row card" onSubmit={(e) => { e.preventDefault(); act(() => api(`/api/events/${id}/feedback`, { method: 'POST', body: review }), 'Feedback saved'); }}>
          <label>Rating
            <select value={review.rating} onChange={(e) => setReview({ ...review, rating: e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label style={{ flex: 1 }}>Comment<input maxLength={500} value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} /></label>
          <button type="submit">Submit feedback</button>
        </form>
      )}
      {fb.items.map((i, k) => (
        <div className="card" key={k}><b>{i.student_name}</b> rated {i.rating}/5<br />{i.comment}</div>
      ))}
      {!fb.items.length && <p className="muted">No feedback yet.</p>}
    </>
  );
}
