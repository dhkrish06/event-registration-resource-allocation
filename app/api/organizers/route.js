import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard } from '@/lib/auth';
import { handleError } from '@/lib/api';

export async function GET() {
  try {
    await guard('admin');
    const r = await query('SELECT organizer_id, organizer_name, department FROM organizer ORDER BY organizer_name');
    return NextResponse.json({ organizers: r.rows });
  } catch (e) { return handleError(e); }
}
