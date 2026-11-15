import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { fail, handleError } from '@/lib/api';
import { createToken } from '@/lib/auth';
import { logActivity } from '@/lib/mongo';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return fail('Email and password are required');
    const r = await query(
      `SELECT u.user_id, u.password_hash, u.role, u.student_id, u.organizer_id,
              COALESCE(s.student_name, o.organizer_name, 'Admin') AS name
       FROM app_user u
       LEFT JOIN student s   ON s.student_id   = u.student_id
       LEFT JOIN organizer o ON o.organizer_id = u.organizer_id
       WHERE u.email = $1`, [email.trim().toLowerCase()]);
    const u = r.rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) return fail('Invalid email or password', 401);

    const payload = { userId: u.user_id, role: u.role, name: u.name, studentId: u.student_id, organizerId: u.organizer_id };
    const token = await createToken(payload);
    const res = NextResponse.json({ user: payload });
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
      secure: process.env.NODE_ENV === 'production' });
    await logActivity(payload, 'LOGIN', {});
    return res;
  } catch (e) { return handleError(e); }
}
