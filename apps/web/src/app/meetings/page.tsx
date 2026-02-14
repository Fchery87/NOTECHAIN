'use client';

import React, { useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { MeetingList } from '@/components/MeetingList';
import { MeetingTranscriber } from '@/components/MeetingTranscriber';
import { useRouter } from 'next/navigation';

/**
 * Meetings Page
 *
 * Main page for managing meeting transcriptions.
 * Displays list of meetings and allows creating new ones.
 */
export default function MeetingsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle opening the new meeting modal
  const handleNewMeeting = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Handle meeting save
  const handleMeetingSave = useCallback(() => {
    setIsModalOpen(false);
    // Refresh the page to show new meeting
    router.refresh();
  }, [router]);

  // Handle meeting selection - navigate to detail page
  const handleMeetingSelect = useCallback(
    (meetingId: string) => {
      router.push(`/meetings/${meetingId}`);
    },
    [router]
  );

  const headerActions = (
    <button
      type="button"
      onClick={handleNewMeeting}
      className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-all duration-300 hover:shadow-lg hover:shadow-stone-900/20"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Meeting
    </button>
  );

  return (
    <AppLayout pageTitle="Meetings" actions={headerActions}>
      <div className="py-6">
        <div className="mb-6">
          <p className="text-stone-600">Record and manage your meeting transcriptions</p>
        </div>
        <MeetingList onMeetingSelect={handleMeetingSelect} />
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div
          data-testid="modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <MeetingTranscriber onSave={handleMeetingSave} onCancel={handleCloseModal} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
