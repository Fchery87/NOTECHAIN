'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createMeetingStorage, type Meeting } from '../lib/storage/meetingStorage';

export interface MeetingListProps {
  /** Callback when a meeting is selected */
  onMeetingSelect?: (meetingId: string) => void;
  /** Callback when a meeting is deleted */
  onDelete?: (meetingId: string) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Format duration in seconds to a human-readable string
 */
function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

/**
 * Format date to a readable string
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * MeetingList Component
 *
 * Displays a list of transcribed meetings with search, filtering, and management features.
 */
export function MeetingList({ onMeetingSelect, onDelete, className = '' }: MeetingListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load meetings on mount
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const storage = createMeetingStorage();
        // Generate a simple encryption key for decryption (same as in MeetingTranscriber)
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);

        const allMeetings = await storage.getAllMeetings(key);
        setMeetings(allMeetings);
      } catch (error) {
        console.error('Failed to load meetings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMeetings();
  }, []);

  // Filter meetings based on search query
  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings;

    const query = searchQuery.toLowerCase();
    return meetings.filter(
      meeting =>
        meeting.title.toLowerCase().includes(query) ||
        meeting.transcript.toLowerCase().includes(query)
    );
  }, [meetings, searchQuery]);

  // Handle meeting selection
  const handleMeetingClick = useCallback(
    (meetingId: string) => {
      onMeetingSelect?.(meetingId);
    },
    [onMeetingSelect]
  );

  // Handle delete with confirmation
  const handleDelete = useCallback(
    async (e: React.MouseEvent, meetingId: string) => {
      e.stopPropagation();

      if (window.confirm('Are you sure you want to delete this meeting?')) {
        try {
          const storage = createMeetingStorage();
          await storage.deleteMeeting(meetingId);
          setMeetings(prev => prev.filter(m => m.id !== meetingId));
          onDelete?.(meetingId);
        } catch (error) {
          console.error('Failed to delete meeting:', error);
        }
      }
    },
    [onDelete]
  );

  // Render loading state
  if (isLoading) {
    return (
      <div data-testid="meeting-list-container" className={`w-full ${className}`}>
        <div className="flex items-center justify-center py-20">
          <div
            data-testid="loading-spinner"
            className="w-8 h-8 border-2 border-stone-200 border-t-amber-500 rounded-full animate-spin"
          />
        </div>
      </div>
    );
  }

  // Render empty state when no meetings exist
  if (meetings.length === 0) {
    return (
      <div data-testid="meeting-list-container" className={`w-full ${className}`}>
        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-stone-100">
            <svg
              className="w-8 h-8 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">No meetings yet</h3>
          <p className="text-stone-500 max-w-sm">Record your first meeting to see it here</p>
        </div>
      </div>
    );
  }

  // Render no results state when search returns nothing
  if (filteredMeetings.length === 0) {
    return (
      <div data-testid="meeting-list-container" className={`w-full ${className}`}>
        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* No Results State */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-stone-100">
            <svg
              className="w-8 h-8 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">No meetings found</h3>
          <p className="text-stone-500 max-w-sm">Try adjusting your search terms</p>
        </div>
      </div>
    );
  }

  // Render meeting list
  return (
    <div data-testid="meeting-list-container" className={`w-full ${className}`}>
      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search meetings..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200"
          />
        </div>
      </div>

      {/* Meeting Cards */}
      <div className="space-y-3">
        {filteredMeetings.map(meeting => (
          <div
            key={meeting.id}
            data-testid={`meeting-card-${meeting.id}`}
            onClick={() => handleMeetingClick(meeting.id)}
            className="group p-4 bg-white rounded-xl border border-stone-200 hover:border-amber-500/50 hover:shadow-md transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="font-medium text-stone-900 truncate mb-1">{meeting.title}</h3>

                {/* Metadata Row */}
                <div className="flex items-center gap-3 text-sm text-stone-500 mb-2">
                  <span>{formatDate(meeting.date)}</span>
                  {meeting.duration && (
                    <>
                      <span className="w-1 h-1 bg-stone-300 rounded-full" />
                      <span>{formatDuration(meeting.duration)}</span>
                    </>
                  )}
                </div>

                {/* Transcript Preview */}
                <p className="text-sm text-stone-600 line-clamp-2">
                  {meeting.transcript.slice(0, 100)}
                  {meeting.transcript.length > 100 ? '...' : ''}
                </p>

                {/* Action Items Badge */}
                {meeting.actionItems.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      {meeting.actionItems.length}
                      {meeting.actionItems.length === 1 ? ' action item' : ' action items'}
                    </span>
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <button
                type="button"
                data-testid={`delete-meeting-${meeting.id}`}
                onClick={e => handleDelete(e, meeting.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all duration-200"
                aria-label={`Delete ${meeting.title}`}
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MeetingList;
