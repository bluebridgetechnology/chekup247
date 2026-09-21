import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Same-origin login proxy.
 *
 * The API and the admin panel are on different origins/domains by design
 * (standalone hosting), so a Set-Cookie from the API response is scoped to
 * the API's own domain and is never visible to this app's middleware.
 *
 * This route runs ON the admin panel's own origin: it forwards the login
 * request server-to-server, then re-sets a presence cookie
 * (`chekup_admin_session`, httpOnly, no token value stored — just a
 * short-lived marker) scoped to THIS app's domain so proxy.ts can
 * perform real server-side redirection. The actual bearer token stays in
 * the JSON body, returned to the client and stored client-side for the
 * Authorization header on every subsequent API call — the backend's
 * JwtAuthGuard + RolesGuard remain the real authorization boundary.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  const apiRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await apiRes.json();

  if (!apiRes.ok) {
    return NextResponse.json(data, { status: apiRes.status });
  }

  // 2FA challenge: password was correct but no session exists yet — pass
  // it straight through with no cookie. The client calls
  // /api/auth/totp/complete-login next.
  if (data.requiresTotp) {
    return NextResponse.json(data);
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
    maxAge: body.remember_me ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
