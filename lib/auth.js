import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { HttpError } from './api';
import { query } from './db';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export const createToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('8h').sign(secret());

export async function getUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret())).payload; } catch { return null; }
}

// Throws 401/403 unless the logged-in user has one of the roles
export async function guard(...roles) {
  const user = await getUser();
  if (!user) throw new HttpError('Please log in', 401);
  if (roles.length && !roles.includes(user.role)) throw new HttpError('You do not have permission', 403);
  return user;
}

// Admin can manage any event; an organizer only their own events
export async function assertCanManage(user, eventId) {
  const r = await query('SELECT organizer_id FROM event WHERE event_id = $1', [eventId]);
  if (!r.rowCount) throw new HttpError('Event not found', 404);
  if (user.role === 'admin') return;
  if (user.role === 'organizer' && r.rows[0].organizer_id === user.organizerId) return;
  throw new HttpError('You can only manage your own events', 403);
}
