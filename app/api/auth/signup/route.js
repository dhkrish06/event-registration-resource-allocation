import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { fail, handleError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export async function POST(req) {
  const { name, email, password, role, department, phone } = await req.json();
  if (!name?.trim() || !email?.trim() || !password || !department?.trim())
    return fail('Name, email, department and password are required');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Invalid email address');
  if (password.length < 8) return fail('Password must be at least 8 characters');
  if (!['student', 'organizer'].includes(role)) return fail('Role must be student or organizer');
  if (phone && !/^[0-9]{10}$/.test(phone)) return fail('Phone must be 10 digits');

  const hash = await bcrypt.hash(password, 10);
  const mail = email.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let studentId = null, organizerId = null;
    if (role === 'student') {
      const r = await client.query(
        'INSERT INTO student (student_name, email, department, phone) VALUES ($1,$2,$3,$4) RETURNING student_id',
        [name.trim(), mail, department.trim(), phone || null]);
      studentId = r.rows[0].student_id;
    } else {
      const r = await client.query(
        'INSERT INTO organizer (organizer_name, email, department) VALUES ($1,$2,$3) RETURNING organizer_id',
        [name.trim(), mail, department.trim()]);
      organizerId = r.rows[0].organizer_id;
    }
    await client.query(
      'INSERT INTO app_user (email, password_hash, role, student_id, organizer_id) VALUES ($1,$2,$3,$4,$5)',
      [mail, hash, role, studentId, organizerId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    return handleError(e);
  } finally {
    client.release();
  }
  await logActivity({ role }, 'SIGNUP', { email: mail });
  return NextResponse.json({ ok: true }, { status: 201 });
}
