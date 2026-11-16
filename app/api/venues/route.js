import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard } from '@/lib/auth';
import { fail, handleError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export async function GET() {
  try {
    await guard();
    const r = await query('SELECT * FROM venue ORDER BY venue_name');
    return NextResponse.json({ venues: r.rows });
  } catch (e) { return handleError(e); }
}

export async function POST(req) {
  try {
    const user = await guard('admin');
    const { venue_name, location, capacity } = await req.json();
    const cap = parseInt(capacity, 10);
    if (!venue_name?.trim() || !location?.trim() || !(cap > 0)) return fail('Name, location and a positive capacity are required');
    await query('INSERT INTO venue (venue_name, location, capacity) VALUES ($1,$2,$3)', [venue_name.trim(), location.trim(), cap]);
    await logActivity(user, 'VENUE_CREATED', { venue_name });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req) {
  try {
    const user = await guard('admin');
    const id = new URL(req.url).searchParams.get('id');
    await query('DELETE FROM venue WHERE venue_id = $1', [id]); // blocked by FK if events use it
    await logActivity(user, 'VENUE_DELETED', { venue_id: Number(id) });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleError(e); }
}
