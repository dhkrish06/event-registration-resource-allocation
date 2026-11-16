import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getDb } from '@/lib/mongo';
import { guard } from '@/lib/auth';
import { handleError } from '@/lib/api';

export async function GET() {
  try {
    await guard('admin', 'organizer');

    // JOIN + GROUP BY + ORDER BY
    const registrationsPerEvent = (await query(
      `SELECT e.event_name, v.venue_name, v.capacity,
              COUNT(r.registration_id) FILTER (WHERE r.registration_status='Registered') AS registered,
              COUNT(r.registration_id) FILTER (WHERE r.registration_status='Waitlisted') AS waitlisted
       FROM event e JOIN venue v ON v.venue_id = e.venue_id
       LEFT JOIN registration r ON r.event_id = e.event_id
       GROUP BY e.event_id, v.venue_id ORDER BY registered DESC`)).rows;

    // GROUP BY + HAVING: departments with at least 2 active registrations
    const activeDepartments = (await query(
      `SELECT s.department, COUNT(*) AS total_registrations
       FROM registration r JOIN student s ON s.student_id = r.student_id
       WHERE r.registration_status = 'Registered'
       GROUP BY s.department HAVING COUNT(*) >= 2
       ORDER BY total_registrations DESC`)).rows;

    // Subquery: students who have not registered for any event
    const inactiveStudents = (await query(
      `SELECT student_name, email, department FROM student s
       WHERE NOT EXISTS (SELECT 1 FROM registration r
                         WHERE r.student_id = s.student_id AND r.registration_status <> 'Cancelled')
       ORDER BY student_name`)).rows;

    // Subquery + aggregate: events filled above the average fill percentage
    const popularEvents = (await query(
      `SELECT event_name, registered_count, capacity,
              ROUND(registered_count * 100.0 / capacity, 1) AS fill_percent
       FROM v_event_summary
       WHERE registered_count * 1.0 / capacity >
             (SELECT AVG(registered_count * 1.0 / capacity) FROM v_event_summary)
       ORDER BY fill_percent DESC`)).rows;

    // View: resource utilisation
    const resourceUsage = (await query(
      `SELECT resource_name, resource_type, total_quantity, allocated_quantity, available_quantity
       FROM v_resource_usage ORDER BY allocated_quantity DESC`)).rows;

    // MongoDB aggregation: average rating per event + activity counts
    let ratings = [], activity = [];
    try {
      const db = await getDb();
      const raw = await db.collection('feedback').aggregate([
        { $group: { _id: '$event_id', avg_rating: { $avg: '$rating' }, responses: { $sum: 1 } } },
        { $sort: { avg_rating: -1 } },
      ]).toArray();
      if (raw.length) {
        const names = (await query('SELECT event_id, event_name FROM event WHERE event_id = ANY($1::int[])',
          [raw.map((x) => x._id)])).rows;
        const map = Object.fromEntries(names.map((n) => [n.event_id, n.event_name]));
        ratings = raw.map((x) => ({ event_name: map[x._id] || `Event #${x._id}`, avg_rating: Number(x.avg_rating.toFixed(2)), responses: x.responses }));
      }
      activity = (await db.collection('activity_logs').aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray()).map((x) => ({ action: x._id, count: x.count }));
    } catch (e) { console.error('Mongo report failed:', e.message); }

    return NextResponse.json({ registrationsPerEvent, activeDepartments, inactiveStudents, popularEvents, resourceUsage, ratings, activity });
  } catch (e) { return handleError(e); }
}
