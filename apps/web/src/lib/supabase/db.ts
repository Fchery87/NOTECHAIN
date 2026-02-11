import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  timezone: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    sidebarCollapsed: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Get user profile from database
 * Note: Profile is automatically created by trigger on signup
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching profile:', error);
    return null;
  }

  // Decrypt profile data (client-side)
  // In production, this would use the user's encryption key
  return {
    id: profile.id,
    email: user.email!,
    timezone: 'UTC',
    preferences: {
      theme: 'system',
      fontSize: 'medium',
      sidebarCollapsed: false,
    },
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  _updates: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Encrypt profile data before storing (client-side encryption)
  // For now, we'll store minimal data
  const { error } = await supabase
    .from('profiles')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (event: string, user: User | null) => void) {
  const supabase = createClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user ?? null);
  });
}
