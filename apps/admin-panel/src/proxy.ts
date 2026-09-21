import { NextResponse, type NextRequest } from 'next/server';

/**
 * Admin Authentication Boundary Proxy (standalone deployment)
 *
 * Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`
 * (exported function `middleware` -> `proxy`); this file is that
 * migration, moved from the former src/middleware.ts with no behavior
 * change. See https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * The admin panel is hosted on its own origin, independent of patient-web
 * and doctor-portal, so there is no shared cookie jar to defend against.
 *
 * The API lives on a different origin, so a Set-Cookie from the API's
 * login response is scoped to the API's own domain and is never visible
 * here. Login instead goes through this app's own same-origin route
 * handler (/api/auth/login), which forwards to the API server-to-server
 * and re-sets a presence-only cookie (`chekup_admin_session`) scoped to
 * THIS app's domain. That is the cookie this proxy checks.
 *
 * This is real server-side redirection (unlike the original no-op that
 * always called NextResponse.next()) but it is NOT the authorization
 * boundary — the actual Bearer JWT is validated per-request by the
 * backend's JwtAuthGuard + RolesGuard on every API call. A missing or
 * stale presence cookie here only means "redirect to /login"; it cannot
 * forge access to a protected endpoint. There is no signup route: admin
 * accounts are created only via the bootstrap seed or an existing
 * admin's invite action.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, favicon, the login page itself, and health probes
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

  if (!adminSession?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'unauthenticated');
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('x-admin-isolation', 'redirected');
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('x-admin-isolation', 'authenticated');
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
