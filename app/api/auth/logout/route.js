import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { logActivity } from '@/lib/mongo';

export async function POST() {
  const user = await getUser();
  if (user) await logActivity(user, 'LOGOUT', {});
  const res = NextResponse.json({ ok: true });
  res.cookies.set('token', '', { path: '/', maxAge: 0 });
  return res;
}
