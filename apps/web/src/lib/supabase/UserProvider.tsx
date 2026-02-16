'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  role: 'user' | 'admin' | 'moderator' | null;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
  isAdmin: false,
  isModerator: false,
  role: null,
  signOut: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_error] = useState<string | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | 'moderator' | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Fetch user role from profiles table (non-blocking)
    const fetchUserRole = async (userId: string) => {
      try {
        console.log('[UserProvider] Fetching role for user:', userId);

        // First, check if profile exists
        const { data: profiles, error: listError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId);

        console.log('[UserProvider] Query result:', {
          profiles,
          listError,
          count: profiles?.length,
        });

        if (listError) {
          console.error('[UserProvider] Error fetching role:', {
            message: listError.message,
            code: listError.code,
            details: listError.details,
            hint: listError.hint,
            fullError: listError,
          });
          setRole('user');
          return;
        }

        if (!profiles || profiles.length === 0) {
          console.warn('[UserProvider] No profile found for user:', userId);
          setRole('user');
          return;
        }

        const role = profiles[0]?.role || 'user';
        console.log('[UserProvider] Role fetched successfully:', role);
        setRole(role);
      } catch (err) {
        console.error('[UserProvider] Exception fetching role:', err);
        setRole('user'); // Default to 'user' if fetch fails
      }
    };

    // Subscribe to auth changes
    // onAuthStateChange fires immediately with INITIAL_SESSION event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user ?? null;

      setUser(sessionUser);
      setIsLoading(false); // Set loading false immediately so page can render

      // Fetch role in background (non-blocking)
      if (sessionUser) {
        fetchUserRole(sessionUser.id);
      } else {
        setRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator' || role === 'admin';

  // Debug logging
  useEffect(() => {
    console.log('[UserProvider] State update:', {
      user: user?.email,
      role,
      isAdmin,
      isModerator,
    });
  }, [user, role, isAdmin, isModerator]);

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      setUser(null);
      setRole(null);
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Local state is already cleared
    }
  }, []);

  return (
    <UserContext.Provider
      value={{ user, isLoading, error: _error, isAdmin, isModerator, role, signOut }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Hook for admin-only access
export function useRequireAdmin() {
  const { isAdmin, isLoading } = useUser();
  return { isAdmin, isLoading };
}
