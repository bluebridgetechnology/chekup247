import { NextResponse } from 'next/server';

/**
 * Same-origin logout: clears the presence cookie set by /api/auth/login.
 * The client also clears its localStorage bearer token separately.
 */
export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.set('chekup_admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
