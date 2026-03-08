'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSpeechTranscription } from '../hooks/useWebSpeechTranscription';
import { WebSpeechTranscriptionService } from '../lib/ai/transcription/webSpeechTranscriptionService';
import { extractActionItems, type ActionItem } from '../lib/ai/transcription/actionItemExtractor';
import {
  createMeetingStorage,
  type Meeting,
  type MeetingInput,
} from '../lib/storage/meetingStorage';

export interface MeetingTranscriberProps {
  /** Optional calendar event ID to link the meeting */
  calendarEventId?: string;
  /** Optional initial title for the meeting */
  initialTitle?: string;
  /** Callback when meeting is saved */
  onSave?: (meeting: Meeting) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
}

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Browser support warning component
 */
function BrowserSupportWarning() {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-900">Browser Not Supported</p>
          <p className="text-xs text-amber-800 mt-1">
            Speech transcription requires Chrome, Edge, or Opera. Please switch to a supported
            browser to use this feature.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * MeetingTranscriber Component
 *
 * Records audio, transcribes it using local Whisper model,
 * extracts action items, and saves encrypted meetings.
 */
export function MeetingTranscriber({
  calendarEventId,
  initialTitle = '',
  onSave,
  onCancel,
}: MeetingTranscriberProps) {
  // Check browser support for Web Speech API
  const isBrowserSupported = WebSpeechTranscriptionService.isSupported();

  // State
  const [title, setTitle] = useState(initialTitle);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Refs
  const meetingStorageRef = useRef(createMeetingStorage());
  const recordingStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Web Speech API transcription hook
  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    supportMessage,
  } = useWebSpeechTranscription({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    onTranscript: (newTranscript, isFinal) => {
      if (isFinal) {
        // Extract action items from the final transcript
        const items = extractActionItems(newTranscript);
        setActionItems(items);
      }
    },
    onError: err => {
      setError(err);
    },
  });

  // Update recording duration
  useEffect(() => {
    if (isListening) {
      recordingStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          setRecordingDuration(elapsed);
        }
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isListening]);

  // Handle start recording
  const handleStartRecording = useCallback(async () => {
    if (!isSpeechSupported) {
      setError(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Opera.'
      );
      return;
    }

    setError(null);
    setAudioBlob(null);
    setRecordingDuration(0);
    resetTranscript();
    setActionItems([]);
    startListening();
  }, [isSpeechSupported, startListening, resetTranscript]);

  // Handle stop recording
  const handleStopRecording = useCallback(async () => {
    stopListening();
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  }, [stopListening]);

  // Handle transcript change
  const handleTranscriptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Note: transcript is now managed by useWebSpeechTranscription hook
    // This handler is kept for UI consistency but doesn't update state directly
  }, []);

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  // Handle action item toggle
  const handleToggleActionItem = useCallback((index: number) => {
    setActionItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, completed: !item.completed } : item))
    );
  }, []);

  // Handle action item text change
  const handleActionItemChange = useCallback((index: number, newText: string) => {
    setActionItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, text: newText } : item))
    );
  }, []);

  // Handle save meeting
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a meeting title');
      return;
    }

    if (!transcript.trim()) {
      setError('No transcript available to save');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Generate a simple encryption key (in production, this should come from user auth)
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);

      const meetingInput: MeetingInput = {
        title: title.trim(),
        date: new Date(),
        duration: recordingDuration,
        transcript,
        actionItems,
        calendarEventId,
        audioBlob: audioBlob || undefined,
      };

      const meetingStorage = meetingStorageRef.current;
      const savedMeeting = await meetingStorage.saveMeeting(meetingInput, key);

      onSave?.(savedMeeting);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meeting');
    } finally {
      setIsSaving(false);
    }
  }, [title, recordingDuration, transcript, actionItems, calendarEventId, audioBlob, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    onCancel?.();
  }, [isListening, stopListening, onCancel]);

  // Check if save is enabled
  const canSave = title.trim() && transcript.trim() && !isListening && !isSaving;

  // Combine final and interim transcripts for display
  const displayTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-100 bg-stone-50">
        <h2 className="font-serif text-2xl font-medium text-stone-900 mb-4">
          Meeting Transcription
        </h2>

        {/* Title Input */}
        <div className="space-y-2">
          <label htmlFor="meeting-title" className="block text-sm font-medium text-stone-600">
            Meeting Title
          </label>
          <input
            id="meeting-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Enter meeting title..."
            className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200"
            disabled={isListening || isSaving}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Browser Support Warning */}
        {!isBrowserSupported && <BrowserSupportWarning />}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isListening ? (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={!isBrowserSupported || isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Start recording"
            >
              {/* Record Icon */}
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="6" fill="currentColor" />
              </svg>
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white font-medium rounded-lg hover:bg-rose-600 transition-all duration-300 relative"
              aria-label="Stop recording"
            >
              {/* Pulse Animation */}
              <span className="absolute top-0 right-0 flex h-3 w-3 -mt-1 -mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>

              {/* Stop Icon */}
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>Stop Recording</span>
            </button>
          )}

          {/* Duration Display */}
          {isListening && (
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-lg">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <span className="font-mono text-lg font-medium text-stone-700">
                {formatDuration(recordingDuration)}
              </span>
            </div>
          )}
        </div>

        {/* Transcript Display */}
        {(displayTranscript || isListening) && (
          <div className="space-y-2">
            <label htmlFor="transcript" className="block text-sm font-medium text-stone-600">
              Transcript
              {isListening && <span className="ml-2 text-xs text-amber-600">● Recording...</span>}
            </label>
            <textarea
              id="transcript"
              value={displayTranscript}
              onChange={handleTranscriptChange}
              rows={8}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200 resize-y"
              placeholder={isListening ? 'Speak now...' : 'Transcript will appear here...'}
              readOnly
            />
            {interimTranscript && !transcript.includes(interimTranscript) && (
              <p className="text-xs text-stone-500 italic">{interimTranscript}</p>
            )}
          </div>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-stone-600">Action Items</h3>
            <div className="space-y-2">
              {actionItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleActionItem(index)}
                    className="mt-1 w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
                  />
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={item.text}
                      onChange={e => handleActionItemChange(index, e.target.value)}
                      className="w-full bg-transparent text-stone-900 focus:outline-none"
                    />
                    {(item.assignee || item.deadline || item.priority) && (
                      <div className="flex items-center gap-2 text-xs">
                        {item.assignee && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            {item.assignee}
                          </span>
                        )}
                        {item.deadline && (
                          <span className="px-2 py-0.5 bg-stone-200 text-stone-600 rounded-full">
                            {item.deadline}
                          </span>
                        )}
                        {item.priority && (
                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              item.priority === 'high'
                                ? 'bg-rose-100 text-rose-600'
                                : item.priority === 'medium'
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-green-100 text-green-600'
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
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="px-5 py-2.5 text-stone-600 font-medium hover:text-stone-900 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="px-5 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Meeting'}
        </button>
      </div>
    </div>
  );
}

export default MeetingTranscriber;
