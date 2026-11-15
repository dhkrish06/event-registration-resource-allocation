import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Redirect to /login when there is no valid token (pages only; APIs enforce their own checks)
export async function middleware(req) {
  const token = req.cookies.get('token')?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
      return NextResponse.next();
    } catch {}
  }
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = { matcher: ['/((?!api|_next|login|signup|favicon.ico).*)'] };
