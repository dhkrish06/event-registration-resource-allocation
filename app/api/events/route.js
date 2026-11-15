import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard } from '@/lib/auth';
import { fail, handleError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

// GET /api/events?q=text&from=YYYY-MM-DD&to=YYYY-MM-DD&venue=ID  (search + filter)
export async function GET(req) {
  try {
    await guard();
    const sp = new URL(req.url).searchParams;
    const q = sp.get('q') || null;
    const from = sp.get('from') || null;
    const to = sp.get('to') || null;
    const venue = sp.get('venue') || null;
    const r = await query(
      `SELECT * FROM v_event_summary
       WHERE ($1::text IS NULL
              OR to_tsvector('english', event_name) @@ plainto_tsquery('english', $1)
              OR event_name ILIKE '%' || $1 || '%')
         AND ($2::date IS NULL OR event_date >= $2::date)
         AND ($3::date IS NULL OR event_date <= $3::date)
         AND ($4::int  IS NULL OR venue_id = $4::int)
       ORDER BY event_date, start_time`, [q, from, to, venue]);
    return NextResponse.json({ events: r.rows });
  } catch (e) { return handleError(e); }
}

export async function POST(req) {
  try {
    const user = await guard('admin', 'organizer');
    const b = await req.json();
    if (!b.event_name?.trim() || !b.event_date || !b.start_time || !b.end_time || !b.venue_id)
      return fail('Name, date, start time, end time and venue are required');
    const organizerId = user.role === 'organizer' ? user.organizerId : b.organizer_id;
    if (!organizerId) return fail('Organizer is required');
    const r = await query(
      `INSERT INTO event (event_name, event_date, start_time, end_time, organizer_id, venue_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING event_id`,
      [b.event_name.trim(), b.event_date, b.start_time, b.end_time, organizerId, b.venue_id]);
    await logActivity(user, 'EVENT_CREATED', { event_id: r.rows[0].event_id, name: b.event_name });
    return NextResponse.json({ event_id: r.rows[0].event_id }, { status: 201 });
  } catch (e) { return handleError(e); }
}
