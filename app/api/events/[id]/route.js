import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard, assertCanManage } from '@/lib/auth';
import { fail, handleError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export async function GET(req, { params }) {
  try {
    const user = await guard();
    const id = params.id;
    const ev = await query('SELECT * FROM v_event_summary WHERE event_id = $1', [id]);
    if (!ev.rowCount) return fail('Event not found', 404);
    const event = ev.rows[0];
    const canManage = user.role === 'admin' || (user.role === 'organizer' && event.organizer_id === user.organizerId);

    const allocations = (await query(
      `SELECT ra.allocation_id, ra.resource_id, er.resource_name, er.resource_type, ra.quantity, ra.allocation_date
       FROM resource_allocation ra JOIN event_resource er ON er.resource_id = ra.resource_id
       WHERE ra.event_id = $1 ORDER BY er.resource_name`, [id])).rows;

    let registrations = [];
    if (canManage) {
      registrations = (await query(
        `SELECT r.registration_id, s.student_name, s.email, s.department, r.registration_status, r.registration_date
         FROM registration r JOIN student s ON s.student_id = r.student_id
         WHERE r.event_id = $1 ORDER BY r.registration_status, r.registration_date, r.registration_id`, [id])).rows;
    }
    let myStatus = null;
    if (user.role === 'student') {
      const m = await query('SELECT registration_status FROM registration WHERE event_id=$1 AND student_id=$2',
        [id, user.studentId]);
      myStatus = m.rows[0]?.registration_status || null;
    }
    return NextResponse.json({ event, allocations, registrations, canManage, myStatus });
  } catch (e) { return handleError(e); }
}

export async function PUT(req, { params }) {
  try {
    const user = await guard('admin', 'organizer');
    await assertCanManage(user, params.id);
    const b = await req.json();
    if (!b.event_name?.trim()) return fail('Event name is required');
    await query(
      `UPDATE event SET event_name=$1, event_date=$2, start_time=$3, end_time=$4, venue_id=$5 WHERE event_id=$6`,
      [b.event_name.trim(), b.event_date, b.start_time, b.end_time, b.venue_id, params.id]);
    await logActivity(user, 'EVENT_UPDATED', { event_id: Number(params.id) });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req, { params }) {
  try {
    const user = await guard('admin', 'organizer');
    await assertCanManage(user, params.id);
    await query('DELETE FROM event WHERE event_id = $1', [params.id]); // cascades; trigger restores stock
    await logActivity(user, 'EVENT_DELETED', { event_id: Number(params.id) });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleError(e); }
}
