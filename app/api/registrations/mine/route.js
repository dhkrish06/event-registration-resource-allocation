import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard } from '@/lib/auth';
import { handleError } from '@/lib/api';

export async function GET() {
  try {
    const user = await guard('student');
    const r = await query(
      `SELECT r.registration_id, r.event_id, e.event_name, e.event_date, e.start_time, v.venue_name,
              r.registration_status, r.registration_date
       FROM registration r
       JOIN event e ON e.event_id = r.event_id
       JOIN venue v ON v.venue_id = e.venue_id
       WHERE r.student_id = $1 ORDER BY e.event_date`, [user.studentId]);
    return NextResponse.json({ registrations: r.rows });
  } catch (e) { return handleError(e); }
}
