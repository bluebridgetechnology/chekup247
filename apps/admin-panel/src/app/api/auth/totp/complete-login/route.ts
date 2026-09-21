import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Same-origin proxy for the second step of a 2FA login — mirrors
 * /api/auth/login's reasoning: the API's own Set-Cookie is scoped to the
 * API's domain and invisible to this app's middleware, so this route
 * re-sets the presence cookie on THIS domain once the challenge succeeds.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  const apiRes = await fetch(`${API_BASE}/auth/totp/complete-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await apiRes.json();

  if (!apiRes.ok) {
    return NextResponse.json(data, { status: apiRes.status });
  }

  if (data.user?.role !== 'admin') {
    return NextResponse.json(
      { message: 'Access Forbidden: Account is not an authorized administrator' },
      { status: 403 },
    );
  }

  const response = NextResponse.json(data);
  response.cookies.set('chekup_admin_session', 'present', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
