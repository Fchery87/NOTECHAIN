'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createMeetingStorage, type Meeting } from '../lib/storage/meetingStorage';

export interface MeetingDetailProps {
  /** Meeting ID to display */
  meetingId: string;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Callback when meeting is deleted */
  onDelete?: (meetingId: string) => void;
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
 * MeetingDetail Component
 *
 * Displays detailed view of a single meeting with full transcript,
 * action items, and editing capabilities.
 */
export function MeetingDetail({ meetingId, onBack, onDelete }: MeetingDetailProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Load meeting on mount
  useEffect(() => {
    const loadMeeting = async () => {
      try {
        const storage = createMeetingStorage();
        // Generate a simple encryption key for decryption
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);

        const loadedMeeting = await storage.getMeeting(meetingId, key);
        setMeeting(loadedMeeting);
        if (loadedMeeting) {
          setEditedTitle(loadedMeeting.title);
        }
      } catch (error) {
        console.error('Failed to load meeting:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMeeting();
  }, [meetingId]);

  // Handle title edit
  const handleTitleEdit = useCallback(() => {
    if (meeting) {
      setIsEditingTitle(true);
    }
  }, [meeting]);

  // Handle title save
  const handleTitleSave = useCallback(async () => {
    if (meeting && editedTitle.trim() && editedTitle !== meeting.title) {
      try {
        const storage = createMeetingStorage();
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);

        const updatedMeeting = await storage.updateMeeting(
          meeting.id,
          { title: editedTitle.trim() },
          key
        );
        setMeeting(updatedMeeting);
      } catch (error) {
        console.error('Failed to update title:', error);
      }
    }
    setIsEditingTitle(false);
  }, [meeting, editedTitle]);

  // Handle action item toggle
  const handleActionItemToggle = useCallback(
    async (index: number) => {
      if (!meeting) return;

      try {
        const storage = createMeetingStorage();
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);

        const updatedActionItems = meeting.actionItems.map((item, i) =>
          i === index ? { ...item, completed: !item.completed } : item
        );

        const updatedMeeting = await storage.updateMeeting(
          meeting.id,
          { actionItems: updatedActionItems },
          key
        );
        setMeeting(updatedMeeting);
      } catch (error) {
        console.error('Failed to toggle action item:', error);
      }
    },
    [meeting]
  );

  // Handle export markdown
  const handleExportMarkdown = useCallback(() => {
    if (!meeting || typeof document === 'undefined') return;

    const markdown = `# ${meeting.title}\n\n**Date:** ${formatDate(meeting.date)}\n**Duration:** ${formatDuration(meeting.duration)}\n\n## Transcript\n\n${meeting.transcript}\n\n## Action Items\n\n${meeting.actionItems
      .map(
        item =>
          `- [${item.completed ? 'x' : ' '}] ${item.text}${item.assignee ? ` (@${item.assignee})` : ''}${item.deadline ? ` (by ${item.deadline})` : ''}`
      )
      .join('\n')}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;

    // Use setTimeout to ensure cleanup happens after click
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    a.click();
  }, [meeting]);

  // Handle copy transcript
  const handleCopyTranscript = useCallback(async () => {
    if (!meeting) return;

    const text = `# ${meeting.title}\n\n${meeting.transcript}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [meeting]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!meeting) return;

    if (window.confirm('Are you sure you want to delete this meeting?')) {
      try {
        const storage = createMeetingStorage();
        await storage.deleteMeeting(meeting.id);
        onDelete?.(meeting.id);
      } catch (error) {
        console.error('Failed to delete meeting:', error);
      }
    }
  }, [meeting, onDelete]);

  // Render loading state
  if (isLoading) {
    return (
      <div data-testid="meeting-detail-loading" className="w-full">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Render not found state
  if (!meeting) {
    return (
      <div data-testid="meeting-not-found" className="w-full">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-stone-100">
            <svg
              className="w-8 h-8 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">Meeting not found</h3>
          <p className="text-stone-500">The meeting you are looking for does not exist</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="meeting-detail-container" className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {/* Back Button */}
        <button
          type="button"
          data-testid="back-button"
          onClick={onBack}
          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all duration-200"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>

        {/* Title */}
        <div className="flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              data-testid="meeting-title-input"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleTitleSave();
                }
              }}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-2xl font-serif font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200"
              autoFocus
            />
          ) : (
            <h1
              data-testid="meeting-title"
              onClick={handleTitleEdit}
              className="font-serif text-2xl font-medium text-stone-900 cursor-pointer hover:text-stone-700 transition-colors"
            >
              {meeting.title}
            </h1>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-sm text-stone-500">
            <span>{formatDate(meeting.date)}</span>
            {meeting.duration && (
              <>
                <span className="w-1 h-1 bg-stone-300 rounded-full" />
                <span>{formatDuration(meeting.duration)}</span>
              </>
            )}
            {meeting.calendarEventId && (
              <>
                <span className="w-1 h-1 bg-stone-300 rounded-full" />
                <a
                  data-testid="calendar-link"
                  href={`#calendar-${meeting.calendarEventId}`}
                  className="flex items-center gap-1 text-amber-600 hover:text-amber-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Calendar
                </a>
              </>
            )}
          </div>
        </div>

        {/* Delete Button */}
        <button
          type="button"
          data-testid="delete-meeting-button"
          onClick={handleDelete}
          className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all duration-200"
          aria-label="Delete meeting"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Action Items Section */}
      {meeting.actionItems.length > 0 && (
        <div className="mb-8">
          <h2 className="font-serif text-lg font-medium text-stone-900 mb-4">Action Items</h2>
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {meeting.actionItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 border-b border-stone-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleActionItemToggle(index)}
                  className="mt-1 w-5 h-5 rounded border-stone-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <div className="flex-1">
                  <p
                    className={`text-stone-900 ${item.completed ? 'line-through text-stone-400' : ''}`}
                  >
                    {item.text}
                  </p>
                  {(item.assignee || item.deadline || item.priority) && (
                    <div className="flex items-center gap-2 mt-2">
                      {item.assignee && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-stone-100 text-stone-700 text-xs rounded">
                          {item.assignee}
                        </span>
                      )}
                      {item.deadline && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {item.deadline}
                        </span>
                      )}
                      {item.priority && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs rounded ${
                            item.priority === 'high'
                              ? 'bg-rose-100 text-rose-700'
                              : item.priority === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-medium text-stone-900">Transcript</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="copy-transcript-button"
              onClick={handleCopyTranscript}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </button>
            <button
              type="button"
              data-testid="export-transcript-button"
              onClick={handleExportMarkdown}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
          </div>
        </div>

        <div
          data-testid="meeting-transcript"
          className="bg-white rounded-xl border border-stone-200 p-6 min-h-[300px] max-h-[500px] overflow-y-auto"
        >
          <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">{meeting.transcript}</p>
        </div>
      </div>
    </div>
  );
}

export default MeetingDetail;
