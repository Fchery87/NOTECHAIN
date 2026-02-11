'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if Supabase is configured
  const isConfigured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      setError('Supabase is not configured. Please check your environment variables.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.user) {
        // Successful login - redirect to dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    if (!isConfigured) {
      setError('Supabase is not configured. Please check your environment variables.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link href="/" className="font-serif text-4xl font-medium text-stone-900">
            NoteChain
          </Link>
          <p className="mt-2 text-sm text-stone-600">Your thoughts. Encrypted. Yours alone.</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-stone-200 rounded-2xl sm:px-10">
          <h2 className="text-2xl font-medium text-stone-900 mb-6">Sign in to your account</h2>

          {!isConfigured && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Configuration Required:</strong> Supabase is not configured. Please set the
                following environment variables:
              </p>
              <ul className="mt-2 text-xs text-amber-700 list-disc list-inside">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
          )}

          {isConfigured && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>OAuth Setup:</strong> To enable Google/GitHub login, follow the{' '}
                <a
                  href="https://github.com/yourusername/notechain/blob/main/OAUTH_SETUP.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-800"
                >
                  OAuth setup guide
                </a>
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!isConfigured}
                  className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-lg placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 sm:text-sm disabled:bg-stone-100 disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={!isConfigured}
                  className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-lg placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 sm:text-sm disabled:bg-stone-100 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  disabled={!isConfigured}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-stone-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-stone-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/auth/reset-password"
                  className="font-medium text-amber-600 hover:text-amber-500"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !isConfigured}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-stone-50 bg-stone-900 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-stone-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => handleOAuthLogin('google')}
                disabled={loading || !isConfigured}
                className="w-full inline-flex justify-center py-2.5 px-4 border border-stone-300 rounded-lg shadow-sm bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">Continue with Google</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-amber-600 hover:text-amber-500">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-stone-500">
            By signing in, you agree to our{' '}
            <Link href="/privacy" className="text-amber-600 hover:text-amber-500">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-amber-600 hover:text-amber-500">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
