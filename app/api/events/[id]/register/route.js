import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { guard } from '@/lib/auth';
import { HttpError, handleError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

// Register: TRANSACTION with row lock so two students cannot take the last seat together
export async function POST(req, { params }) {
  let user;
  const client = await pool.connect();
  try {
    user = await guard('student');
    await client.query('BEGIN');
    const ev = await client.query(
      `SELECT v.capacity FROM event e JOIN venue v ON v.venue_id = e.venue_id
       WHERE e.event_id = $1 AND e.event_date >= CURRENT_DATE FOR UPDATE OF e`, [params.id]);
    if (!ev.rowCount) throw new HttpError('Event not found or already over', 404);

    const count = (await client.query(
      `SELECT COUNT(*) AS c FROM registration WHERE event_id=$1 AND registration_status='Registered'`,
      [params.id])).rows[0].c;
    const status = count < ev.rows[0].capacity ? 'Registered' : 'Waitlisted';

    const existing = await client.query(
      'SELECT registration_status FROM registration WHERE event_id=$1 AND student_id=$2', [params.id, user.studentId]);
    if (existing.rowCount) {
      if (existing.rows[0].registration_status !== 'Cancelled') throw new HttpError('You are already registered for this event', 409);
      await client.query(
        `UPDATE registration SET registration_status=$1, registration_date=CURRENT_DATE
         WHERE event_id=$2 AND student_id=$3`, [status, params.id, user.studentId]);
    } else {
      await client.query(
        'INSERT INTO registration (student_id, event_id, registration_status) VALUES ($1,$2,$3)',
        [user.studentId, params.id, status]);
    }
    await client.query('COMMIT');
    await logActivity(user, 'REGISTERED', { event_id: Number(params.id), status });
    return NextResponse.json({ status });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    return handleError(e);
  } finally { client.release(); }
}

// Cancel: TRANSACTION that cancels and promotes the first waitlisted student
export async function DELETE(req, { params }) {
  let user;
  const client = await pool.connect();
  try {
    user = await guard('student');
    await client.query('BEGIN');
    await client.query('SELECT 1 FROM event WHERE event_id=$1 FOR UPDATE', [params.id]);
    const cur = await client.query(
      `SELECT registration_status FROM registration
       WHERE event_id=$1 AND student_id=$2 AND registration_status IN ('Registered','Waitlisted')`,
      [params.id, user.studentId]);
    if (!cur.rowCount) throw new HttpError('No active registration found', 404);

    await client.query(
      `UPDATE registration SET registration_status='Cancelled' WHERE event_id=$1 AND student_id=$2`,
      [params.id, user.studentId]);

    let promoted = false;
    if (cur.rows[0].registration_status === 'Registered') {
      const p = await client.query(
        `UPDATE registration SET registration_status='Registered'
         WHERE registration_id = (SELECT registration_id FROM registration
                                  WHERE event_id=$1 AND registration_status='Waitlisted'
                                  ORDER BY registration_date, registration_id LIMIT 1)`, [params.id]);
      promoted = p.rowCount > 0;
    }
    await client.query('COMMIT');
    await logActivity(user, 'CANCELLED', { event_id: Number(params.id), promoted });
    return NextResponse.json({ ok: true, promoted });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    return handleError(e);
  } finally { client.release(); }
}
