'use client';

import React, { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
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
    <AppLayout showBackButton backHref="/meetings">
      <div className="py-6">
        <MeetingDetail meetingId={meetingId} onBack={handleBack} onDelete={handleDelete} />
      </div>
    </AppLayout>
  );
}
