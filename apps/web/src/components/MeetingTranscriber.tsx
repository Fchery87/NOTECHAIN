'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { transcriptionService } from '../lib/ai/transcription/transcriptionService';
import { extractActionItems, type ActionItem } from '../lib/ai/transcription/actionItemExtractor';
import {
  createMeetingStorage,
  type Meeting,
  type MeetingInput,
} from '../lib/storage/meetingStorage';
import { encryptData } from '@notechain/core-crypto';

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
  // State
  const [title, setTitle] = useState(initialTitle);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const meetingStorageRef = useRef(createMeetingStorage());

  // Audio capture hook
  const {
    isRecording,
    isSupported: isAudioSupported,
    duration: recordingDuration,
    error: audioError,
    startRecording,
    stopRecording,
  } = useAudioCapture({
    onError: err => setError(err),
  });

  // Update duration when recording
  useEffect(() => {
    setDuration(recordingDuration);
  }, [recordingDuration]);

  // Update error from audio capture
  useEffect(() => {
    if (audioError) {
      setError(audioError);
    }
  }, [audioError]);

  // Initialize transcription service on mount
  useEffect(() => {
    const init = async () => {
      try {
        await transcriptionService.initialize();
      } catch (err) {
        setError('Failed to initialize transcription service');
      }
    };
    init();
  }, []);

  // Handle start recording
  const handleStartRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    setActionItems([]);
    setProgress(0);
    setAudioBlob(null);
    await startRecording();
  }, [startRecording]);

  // Handle stop recording and transcription
  const handleStopRecording = useCallback(async () => {
    try {
      const blob = await stopRecording();
      if (blob) {
        setAudioBlob(blob);
        setIsTranscribing(true);
        setProgress(0);

        // Transcribe audio
        const transcribedText = await transcriptionService.transcribeAudio(blob, prog => {
          setProgress(Math.round(prog * 100));
        });

        setTranscript(transcribedText);

        // Extract action items
        const items = extractActionItems(transcribedText);
        setActionItems(items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
      setProgress(100);
    }
  }, [stopRecording]);

  // Handle transcript change
  const handleTranscriptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(e.target.value);
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

    try {
      setIsSaving(true);
      setError(null);

      // Generate a simple encryption key (in production, this should come from user auth)
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);

      const meetingInput: MeetingInput = {
        title: title.trim(),
        date: new Date(),
        duration,
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
  }, [title, duration, transcript, actionItems, calendarEventId, audioBlob, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    onCancel?.();
  }, [isRecording, stopRecording, onCancel]);

  // Check if save is enabled
  const canSave = title.trim() && transcript && !isTranscribing && !isSaving;

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
            disabled={isRecording || isTranscribing}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={!isAudioSupported || isTranscribing}
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
          {isRecording && (
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-lg">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <span className="font-mono text-lg font-medium text-stone-700">
                {formatDuration(duration)}
              </span>
            </div>
          )}
        </div>

        {/* Transcription Progress */}
        {isTranscribing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">Transcribing...</span>
              <span className="text-stone-500">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="space-y-2">
            <label htmlFor="transcript" className="block text-sm font-medium text-stone-600">
              Transcript
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={handleTranscriptChange}
              rows={8}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200 resize-y"
              placeholder="Transcript will appear here..."
              disabled={isTranscribing}
            />
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
