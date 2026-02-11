import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Auth callback handler for PKCE flow
 * Exchanges the auth code for a session
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful authentication - redirect to dashboard
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
