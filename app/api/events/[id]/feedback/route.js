import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getDb, logActivity } from '@/lib/mongo';
import { guard } from '@/lib/auth';
import { fail, handleError } from '@/lib/api';

// Feedback documents live in MongoDB (flexible, text-heavy, no joins needed)
export async function GET(req, { params }) {
  try {
    await guard();
    const eventId = Number(params.id);
    const db = await getDb();
    const items = await db.collection('feedback').find({ event_id: eventId }).sort({ created_at: -1 }).toArray();
    const agg = await db.collection('feedback').aggregate([
      { $match: { event_id: eventId } },
      { $group: { _id: '$event_id', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]).toArray();
    return NextResponse.json({
      items: items.map((i) => ({ student_name: i.student_name, rating: i.rating, comment: i.comment, created_at: i.created_at })),
      avg: agg[0] ? Number(agg[0].avg.toFixed(2)) : null,
      count: agg[0]?.count || 0,
    });
  } catch (e) {
    if (e?.status) return handleError(e);
    return NextResponse.json({ items: [], avg: null, count: 0, warning: 'Feedback store unavailable' });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await guard('student');
    const { rating, comment } = await req.json();
    const r = parseInt(rating, 10);
    if (!(r >= 1 && r <= 5)) return fail('Rating must be between 1 and 5');
    if ((comment || '').length > 500) return fail('Comment must be 500 characters or fewer');
    const reg = await query(
      `SELECT 1 FROM registration WHERE event_id=$1 AND student_id=$2 AND registration_status='Registered'`,
      [params.id, user.studentId]);
    if (!reg.rowCount) return fail('Only registered students can give feedback', 403);

    const db = await getDb();
    await db.collection('feedback').updateOne(
      { event_id: Number(params.id), student_id: user.studentId },
      { $set: { student_name: user.name, rating: r, comment: (comment || '').trim(), created_at: new Date() } },
      { upsert: true });
    await logActivity(user, 'FEEDBACK_SUBMITTED', { event_id: Number(params.id), rating: r });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) { return handleError(e); }
}
