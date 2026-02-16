import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Auth callback handler for PKCE flow
 * Exchanges the auth code for a session and ensures user metadata is properly stored
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/dashboard';

  // If no code, show error page
  if (!code) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Error - NoteChain</title>
          <style>
            body {
              font-family: 'DM Sans', system-ui, sans-serif;
              background-color: #fafaf9;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              padding: 2rem;
              max-width: 400px;
            }
            .icon {
              width: 64px;
              height: 64px;
              background-color: #fef2f2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1.5rem;
            }
            h1 {
              font-family: 'Newsreader', Georgia, serif;
              font-size: 1.5rem;
              font-weight: 500;
              color: #1c1917;
              margin-bottom: 0.5rem;
            }
            p {
              color: #57534e;
              margin-bottom: 1.5rem;
            }
            a {
              display: inline-block;
              padding: 0.625rem 1.25rem;
              background-color: #1c1917;
              color: #fafaf9;
              text-decoration: none;
              border-radius: 0.5rem;
              font-weight: 500;
            }
            a:hover {
              background-color: #292524;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            </div>
            <h1>Authentication Failed</h1>
            <p>We couldn't complete the sign in process. Please try again.</p>
            <a href="/auth/login">Back to Sign In</a>
          </div>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // Show loading page while exchanging code
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] Error exchanging code:', error);
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Authentication Error - NoteChain</title>
            <style>
              body {
                font-family: 'DM Sans', system-ui, sans-serif;
                background-color: #fafaf9;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
              }
              .container {
                text-align: center;
                padding: 2rem;
                max-width: 400px;
              }
              .icon {
                width: 64px;
                height: 64px;
                background-color: #fef2f2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
              }
              h1 {
                font-family: 'Newsreader', Georgia, serif;
                font-size: 1.5rem;
                font-weight: 500;
                color: #1c1917;
                margin-bottom: 0.5rem;
              }
              p {
                color: #57534e;
                margin-bottom: 1.5rem;
              }
              a {
                display: inline-block;
                padding: 0.625rem 1.25rem;
                background-color: #1c1917;
                color: #fafaf9;
                text-decoration: none;
                border-radius: 0.5rem;
                font-weight: 500;
              }
              a:hover {
                background-color: #292524;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              </div>
              <h1>Authentication Failed</h1>
              <p>${error.message || 'An error occurred during sign in. Please try again.'}</p>
              <a href="/auth/login">Back to Sign In</a>
            </div>
          </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    if (data?.user) {
      // Ensure user metadata is available
      // Google OAuth provides: full_name, given_name, family_name, picture, email
      const userMetadata = data.user.user_metadata || {};

      // Create or update user profile in the profiles table
      if (data.user.id && data.user.email) {
        try {
          await supabase.from('profiles').upsert(
            {
              id: data.user.id,
              email: data.user.email,
              full_name:
                userMetadata.full_name || userMetadata.name || userMetadata.given_name || '',
              avatar_url: userMetadata.avatar_url || userMetadata.picture || '',
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false,
            }
          );
        } catch (profileError) {
          console.error('[Auth Callback] Error creating/updating user profile:', profileError);
          // Don't fail the auth flow if profile creation fails
        }
      }

      // Successful authentication - redirect to original protected route or dashboard
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err);
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Error - NoteChain</title>
          <style>
            body {
              font-family: 'DM Sans', system-ui, sans-serif;
              background-color: #fafaf9;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              padding: 2rem;
              max-width: 400px;
            }
            .icon {
              width: 64px;
              height: 64px;
              background-color: #fef2f2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1.5rem;
            }
            h1 {
              font-family: 'Newsreader', Georgia, serif;
              font-size: 1.5rem;
              font-weight: 500;
              color: #1c1917;
              margin-bottom: 0.5rem;
            }
            p {
              color: #57534e;
              margin-bottom: 1.5rem;
            }
            a {
              display: inline-block;
              padding: 0.625rem 1.25rem;
              background-color: #1c1917;
              color: #fafaf9;
              text-decoration: none;
              border-radius: 0.5rem;
              font-weight: 500;
            }
            a:hover {
              background-color: #292524;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            </div>
            <h1>Authentication Error</h1>
            <p>An unexpected error occurred. Please try again.</p>
            <a href="/auth/login">Back to Sign In</a>
          </div>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // Fallback - return the user to an error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
