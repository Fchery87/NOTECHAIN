import { createBrowserClient } from '@supabase/ssr';

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "@supabase/ssr: Your project's URL and API key are required to create a Supabase client!\n\n" +
        "Check your Supabase project's API settings to find these values\n\n" +
        'https://supabase.com/dashboard/project/_/settings/api'
    );
  }

  return createBrowserClient(url, key);
}

/**
 * Singleton client instance for browser contexts.
 *
 * Supabase GoTrue warns when multiple clients use the same storage key in one
 * browser context. Keep createClient() singleton-backed so legacy call sites that
 * still call createClient() directly do not create competing auth clients.
 */
let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;

/**
 * Creates or returns the Supabase client for use in browser components.
 * Uses cookies for session persistence.
 */
export function createClient(): ReturnType<typeof createBrowserSupabaseClient> {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }

  return browserClient;
}

/**
 * Singleton client instance for use in non-React contexts
 */
export function getBrowserClient(): ReturnType<typeof createBrowserSupabaseClient> {
  return createClient();
}

/**
 * Safe client getter that returns null if not configured
 * Useful for build-time checks
 */
export function getClientSafe() {
  try {
    return createClient();
  } catch {
    return null;
  }
}
