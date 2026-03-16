import { NextResponse, type NextRequest } from 'next/server';

export function updateSession(request: NextRequest) {
  const isAuthenticated = !!request.cookies.get('demo_user_id');

  // Protected routes
  const protectedPaths = ['/dashboard', '/policies', '/admin', '/approvals', '/repository', '/monitoring', '/audit', '/tasks'];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/register'];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPage && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
