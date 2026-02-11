'use client';

import React, { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MeetingDetail } from '@/components/MeetingDetail';

/**
 * Meeting Detail Page
 *
 * Displays detailed view of a single meeting.
 * Uses dynamic route parameter to load specific meeting.
 */
export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push('/meetings');
  }, [router]);

  // Handle meeting deletion
  const handleDelete = useCallback(
    (_meetingId: string) => {
      // Navigate back to meetings list after deletion
      router.push('/meetings');
    },
    [router]
  );

  return (
    <div data-testid="meeting-detail-page" className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Meetings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <MeetingDetail meetingId={meetingId} onBack={handleBack} onDelete={handleDelete} />
      </main>
    </div>
  );
}
