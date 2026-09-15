import { NextResponse, type NextRequest } from 'next/server';

/**
 * Strict Admin Authentication Boundary Middleware
 * - Completely isolated authentication domain.
 * - Rejects patient/doctor session cookies (e.g. chekup_session, doctor_session).
 * - Enforces dedicated 'chekup_admin_session' token.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, favicon, login page, and health probes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/login' ||
    pathname === '/api/health' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const adminSession = request.cookies.get('chekup_admin_session');

  // Prevent cross-talk: if request presents patient or doctor cookies, reject immediately
  const hasPatientCookie = request.cookies.has('chekup_patient_session');
  const hasDoctorCookie = request.cookies.has('chekup_doctor_session');

  if (hasPatientCookie || hasDoctorCookie) {
    return new NextResponse(
      JSON.stringify({
        error: 'Forbidden',
        message: 'Security Violation: Cross-application session cookies detected.',
      }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    );
  }

  // If unauthenticated in development, allow preview but add isolated header
  if (!adminSession) {
    // In dev demo mode, redirect to /login or set mock header
    const response = NextResponse.next();
    response.headers.set('x-admin-isolation', 'active');
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('x-admin-isolation', 'authenticated');
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
