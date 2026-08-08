import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Gate every /dashboard route on a real Supabase session, and keep that session
 * refreshed so a working tab does not silently expire.
 *
 * This runs before the page does, so an unauthenticated visitor never receives
 * dashboard markup at all — they are redirected to /login first.
 */
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // getUser() revalidates against Supabase. getSession() only decodes the
  // cookie, which the browser controls, so it must not be used to authorise.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isLogin = pathname === '/login';

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Send them back where they were headed once they sign in.
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
};
