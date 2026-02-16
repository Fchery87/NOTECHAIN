import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { applyRateLimit } from './lib/security/serverRateLimiter';
import { generateNonce, getSecurityHeadersWithNonce } from './lib/security/csp';

export async function middleware(request: NextRequest) {
  // Generate nonce for this request
  const nonce = generateNonce();

  // Determine environment
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Apply rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Use stricter rate limiting for auth endpoints
    if (request.nextUrl.pathname.includes('/auth/')) {
      const rateLimitResponse = await applyRateLimit(request, 'auth');
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }
    // Use password reset rate limiting for password reset endpoints
    else if (request.nextUrl.pathname.includes('/reset-password')) {
      const rateLimitResponse = await applyRateLimit(request, 'passwordReset');
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }
    // Use search rate limiting for search endpoints
    else if (request.nextUrl.pathname.includes('/search')) {
      const rateLimitResponse = await applyRateLimit(request, 'search');
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }
    // Standard API rate limiting for all other API routes
    else {
      const rateLimitResponse = await applyRateLimit(request, 'api');
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Apply security headers with nonce-based CSP
  const securityHeaders = getSecurityHeadersWithNonce({
    scriptNonce: nonce,
    styleNonce: nonce,
    isDevelopment,
  });

  // Set security headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    if (value) {
      response.headers.set(key, value);
    }
  }

  // Set nonce in response headers for use in components
  response.headers.set('x-nonce', nonce);

  // Check if Supabase is configured before creating client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // If Supabase is not configured, allow access to public routes
    // Protected routes will be handled by client-side auth
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        response.cookies.set({ name, value, ...options });

        // Re-apply security headers after response recreation
        for (const [key, value] of Object.entries(securityHeaders)) {
          if (value) {
            response.headers.set(key, value);
          }
        }
        response.headers.set('x-nonce', nonce);
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        response.cookies.set({ name, value: '', ...options });

        // Re-apply security headers after response recreation
        for (const [key, value] of Object.entries(securityHeaders)) {
          if (value) {
            response.headers.set(key, value);
          }
        }
        response.headers.set('x-nonce', nonce);
      },
    },
  });

  // Refresh session if expired - required for Server Components to work
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // Protected routes - require authentication
  const protectedRoutes = [
    '/dashboard',
    '/notes',
    '/todos',
    '/calendar',
    '/pdfs',
    '/search',
    '/settings',
    '/meetings',
    '/teams',
    '/ocr',
    '/graph',
    '/admin',
  ];
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    // Redirect to login if accessing protected route without auth
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin routes - require admin role
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  if (isAdminRoute && user) {
    // Check if user has admin role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
      // Redirect non-admin users to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Auth routes - redirect to dashboard if already logged in
  const authRoutes = ['/auth/login', '/auth/signup'];
  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname === route);

  if (isAuthRoute && user) {
    // Redirect to dashboard if already authenticated
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
