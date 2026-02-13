'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createMeetingStorage, type Meeting } from '../lib/storage/meetingStorage';
import { MeetingTranscriber } from './MeetingTranscriber';

/**
 * Props for CalendarEventTranscript component
 */
export interface CalendarEventTranscriptProps {
  /** Calendar event ID */
  eventId: string;
  /** Calendar event title */
  eventTitle: string;
  /** Calendar event date */
  eventDate: Date;
  /** Callback when user initiates transcription */
  onTranscribe?: (eventId: string) => void;
  /** Callback when user wants to view full meeting */
  onViewMeeting?: (meetingId: string) => void;
}

/**
 * Format transcript preview (first 100 characters)
 */
function formatTranscriptPreview(transcript: string): string {
  if (transcript.length <= 100) {
    return transcript;
  }
  return transcript.substring(0, 100) + '...';
}

/**
 * Count pending action items
 */
function countPendingActionItems(meeting: Meeting): number {
  return meeting.actionItems.filter(item => !item.completed).length;
}

/**
 * CalendarEventTranscript Component
 *
 * Displays transcription status for a calendar event and allows
 * users to transcribe meetings directly from calendar events.
 */
export function CalendarEventTranscript({
  eventId,
  eventTitle,
  eventDate: _eventDate,
  onTranscribe,
  onViewMeeting,
}: CalendarEventTranscriptProps) {
  // State
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranscriber, setShowTranscriber] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const meetingStorageRef = useRef(createMeetingStorage());

  /**
   * Load meeting data for this calendar event
   */
  const loadMeeting = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const storage = meetingStorageRef.current;
      // Generate a simple key for testing (in production, this should come from user auth)
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);

      const meetings = await storage.getMeetingsByCalendarEvent(eventId, key);

      // Use the most recent meeting if multiple exist
      if (meetings.length > 0) {
        setMeeting(meetings[0]);
      } else {
        setMeeting(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meeting data');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Load meeting data on mount
  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  /**
   * Handle transcribe button click
   */
  const handleTranscribe = useCallback(() => {
    onTranscribe?.(eventId);
    setShowTranscriber(true);
  }, [eventId, onTranscribe]);

  /**
   * Handle view meeting click
   */
  const handleViewMeeting = useCallback(() => {
    if (meeting) {
      onViewMeeting?.(meeting.id);
    }
  }, [meeting, onViewMeeting]);

  /**
   * Handle meeting save from transcriber modal
   */
  const handleSaveMeeting = useCallback(
    (_savedMeeting: Meeting) => {
      setShowTranscriber(false);
      // Refresh meeting data
      loadMeeting();
    },
    [loadMeeting]
  );

  /**
   * Handle transcriber modal cancel
   */
  const handleCancelTranscriber = useCallback(() => {
    setShowTranscriber(false);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 animate-pulse">
        <div className="flex items-center gap-2 text-stone-500">
          <div className="w-4 h-4 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
        <p className="text-sm text-rose-600">Error loading meeting data</p>
      </div>
    );
  }

  // Meeting exists - show transcript summary
  if (meeting) {
    const pendingCount = countPendingActionItems(meeting);
    const totalCount = meeting.actionItems.length;

    return (
      <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-serif font-medium text-stone-900 mb-1">Meeting Transcript</h4>
            <p className="text-sm text-stone-500">
              {new Date(meeting.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {totalCount} action items
              </span>
              {pendingCount > 0 && (
                <span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-xs rounded-full">
                  {pendingCount} pending
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm text-stone-600 leading-relaxed">
            {formatTranscriptPreview(meeting.transcript)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleViewMeeting}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-lg hover:bg-stone-800 transition-all duration-300"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            View Transcript
          </button>

          <button
            type="button"
            onClick={handleViewMeeting}
            className="text-sm text-stone-600 hover:text-stone-900 font-medium transition-colors"
          >
            View full meeting →
          </button>
        </div>
      </div>
    );
  }

  // No meeting - show transcribe prompt
  return (
    <>
      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h4 className="font-serif font-medium text-stone-900 mb-1">No Transcription</h4>
            <p className="text-sm text-stone-500 mb-3">
              This calendar event doesn&apos;t have a meeting transcription yet.
            </p>
            <button
              type="button"
              onClick={handleTranscribe}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-lg hover:bg-stone-800 transition-all duration-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Transcribe Meeting
            </button>
          </div>
        </div>
      </div>

      {/* Meeting Transcriber Modal */}
      {showTranscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <MeetingTranscriber
              calendarEventId={eventId}
              initialTitle={eventTitle}
              onSave={handleSaveMeeting}
              onCancel={handleCancelTranscriber}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default CalendarEventTranscript;
