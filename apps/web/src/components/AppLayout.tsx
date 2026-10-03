'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/supabase/UserProvider';
import WorkspaceSidebar from './WorkspaceSidebar';
import MobileBottomNav from './MobileBottomNav';
import RecoveryKeyOnboarding from './security/RecoveryKeyOnboarding';
import RecoveryRequiredPrompt from './security/RecoveryRequiredPrompt';
import TopActionBar from './TopActionBar';
import CommandPalette from './CommandPalette';

interface AppLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  actions?: React.ReactNode;
  fullWidth?: boolean;
  requireAuth?: boolean;
}

export default function AppLayout({
  children,
  pageTitle,
  showBackButton,
  backHref,
  actions,
  fullWidth = false,
  requireAuth = true,
}: AppLayoutProps) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  // Track if user was ever logged in (to detect logout vs never-logged-in)
  const wasAuthenticated = useRef(false);
  // Track if we've already handled the initial auth check
  const initialCheckDone = useRef(false);

  // Client-side authentication check
  // Only redirect if user was logged in and then logged out (session expiry, etc.)
  // Initial auth protection is handled by middleware
  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) return;

    // Mark that initial check is done
    if (!initialCheckDone.current) {
      initialCheckDone.current = true;
      // If user is authenticated on initial load, mark it
      if (user) {
        wasAuthenticated.current = true;
      }
      return; // Don't redirect on initial check - middleware handles this
    }

    // After initial check, only redirect if:
    // 1. Auth is required
    // 2. User was previously authenticated (had a session)
    // 3. User is now null (session expired or logged out)
    // This prevents redirect loops while still handling session expiry
    if (requireAuth && wasAuthenticated.current && !user) {
      const currentPath = window.location.pathname;
      router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}&reason=session_expired`);
    }

    // Update authentication state
    if (user) {
      wasAuthenticated.current = true;
    }
  }, [requireAuth, isLoading, user, router]);

  // Show loading state while checking authentication
  if (requireAuth && isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required and no user after loading, show minimal UI
  // Middleware should have already redirected, but this is a safety net
  if (requireAuth && !isLoading && !user && initialCheckDone.current) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 mb-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#fafaf9] text-stone-900">
      <WorkspaceSidebar />
      <CommandPalette />

      <div className="flex-1 flex flex-col relative min-w-0 md:ml-64">
        <TopActionBar
          pageTitle={pageTitle}
          showBackButton={showBackButton}
          backHref={backHref}
          actions={actions}
        />

        <main
          id="main-content"
          className={fullWidth ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 overflow-y-auto'}
        >
          <div
            className={
              fullWidth
                ? 'w-full h-full pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0'
                : 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 md:pt-12 md:pb-16 animate-fade-in'
            }
          >
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
      {requireAuth && user && <RecoveryRequiredPrompt />}
      {requireAuth && user && <RecoveryKeyOnboarding />}
    </div>
  );
}
