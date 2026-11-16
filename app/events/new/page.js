'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, useMe } from '@/lib/client';

export default function NewEvent() {
  const me = useMe();
  const router = useRouter();
  const [venues, setVenues] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [f, setF] = useState({ event_name: '', event_date: '', start_time: '', end_time: '', venue_id: '', organizer_id: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api('/api/venues').then((d) => setVenues(d.venues)).catch(() => {}); }, []);
  useEffect(() => { if (me?.role === 'admin') api('/api/organizers').then((d) => setOrganizers(d.organizers)).catch(() => {}); }, [me]);

  async function submit(e) {
    e.preventDefault(); setErr('');
    try { const r = await api('/api/events', { method: 'POST', body: f }); router.push(`/events/${r.event_id}`); }
    catch (e2) { setErr(e2.message); }
  }
  return (
    <div className="card">
      <h1>Create Event</h1>
      {err && <div className="error">{err}</div>}
      <form className="row" onSubmit={submit}>
        <label>Event name<input required value={f.event_name} onChange={set('event_name')} /></label>
        <label>Date<input type="date" required value={f.event_date} onChange={set('event_date')} /></label>
        <label>Start<input type="time" required value={f.start_time} onChange={set('start_time')} /></label>
        <label>End<input type="time" required value={f.end_time} onChange={set('end_time')} /></label>
        <label>Venue
          <select required value={f.venue_id} onChange={set('venue_id')}>
            <option value="">Select</option>
            {venues.map((v) => <option key={v.venue_id} value={v.venue_id}>{v.venue_name} (cap {v.capacity})</option>)}
          </select>
        </label>
        {me?.role === 'admin' && (
          <label>Organizer
            <select required value={f.organizer_id} onChange={set('organizer_id')}>
              <option value="">Select</option>
              {organizers.map((o) => <option key={o.organizer_id} value={o.organizer_id}>{o.organizer_name}</option>)}
            </select>
          </label>
        )}
        <button type="submit">Create event</button>
      </form>
    </div>
  );
}
