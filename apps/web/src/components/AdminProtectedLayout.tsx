'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/supabase/UserProvider';
import AppLayout from '@/components/AppLayout';

interface AdminProtectedLayoutProps {
  children: React.ReactNode;
}

export default function AdminProtectedLayout({ children }: AdminProtectedLayoutProps) {
  const { isAdmin, isLoading, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      // Not logged in, redirect to login
      router.push('/auth/login?redirect=/admin');
    } else if (!isLoading && !isAdmin) {
      // Logged in but not admin, redirect to dashboard
      router.push('/dashboard');
    }
  }, [isLoading, isAdmin, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-rose-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Access Denied</h1>
          <p className="text-stone-600">You don't have permission to access the admin dashboard.</p>
          <a
            href="/dashboard"
            className="mt-6 inline-block px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <AppLayout pageTitle="Admin Dashboard" fullWidth={true}>
      {children}
    </AppLayout>
  );
}
