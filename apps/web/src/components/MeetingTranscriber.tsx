'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useMeetingTranscriptionController } from '../hooks/useMeetingTranscriptionController';
import { extractActionItems, type ActionItem } from '../lib/ai/transcription/actionItemExtractor';
import {
  createMeetingStorage,
  type Meeting,
  type MeetingInput,
} from '../lib/storage/meetingStorage';
import { getMeetingEncryptionKey } from '../lib/storage/meetingEncryptionKey';

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

function getDefaultMeetingTitle(date: Date): string {
  return `Meeting ${date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

/**
 * Browser support warning component with fallback option
 */
function BrowserSupportWarning({ onUseFallback }: { onUseFallback?: () => void }) {
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
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">Limited Browser Support</p>
          <p className="text-xs text-amber-800 mt-1">
            Real-time speech recognition works best in Chrome, Edge, or Opera. Private Mode uses a
            local model after its one-time download/cache warm-up.
          </p>
          {onUseFallback && (
            <button
              onClick={onUseFallback}
              className="mt-2 text-xs text-amber-700 underline hover:text-amber-900"
            >
              Use Private Fallback Mode
            </button>
          )}
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
  // State
  const [title, setTitle] = useState(initialTitle);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const meetingStorageRef = useRef(createMeetingStorage());

  const transcription = useMeetingTranscriptionController({
    onError: setError,
    onFinalTranscript: transcript => {
      setActionItems(extractActionItems(transcript));
    },
  });

  const {
    mode,
    selectMode,
    transcript: currentTranscript,
    audioBlob,
    recordingDuration,
    isRecording,
    isProcessing,
    isWebSpeechSupported,
    isHuggingFaceSupported,
    isHfModelLoaded,
    isHfLoading,
    isHfTranscribing,
    hfProgress,
    canStartSelectedMode,
    startRecording,
    stopRecording,
    stopActiveRecording,
  } = transcription;

  const handleStartRecording = useCallback(async () => {
    setError(null);
    setActionItems([]);
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

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
    const finalTranscript = currentTranscript;

    if (!finalTranscript.trim()) {
      setError('No transcript available to save');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const meetingDate = new Date();
      const meetingTitle = title.trim() || getDefaultMeetingTitle(meetingDate);
      const key = await getMeetingEncryptionKey();

      const confirmedActionItems: ActionItem[] = actionItems.map(item =>
        item.provenance
          ? {
              ...item,
              provenance: {
                ...item.provenance,
                confirmationStatus: 'confirmed',
              },
            }
          : item
      );

      const meetingInput: MeetingInput = {
        title: meetingTitle,
        date: meetingDate,
        duration: recordingDuration,
        transcript: finalTranscript,
        actionItems: confirmedActionItems,
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
  }, [
    title,
    recordingDuration,
    currentTranscript,
    actionItems,
    calendarEventId,
    audioBlob,
    onSave,
  ]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    stopActiveRecording();
    onCancel?.();
  }, [stopActiveRecording, onCancel]);

  // Check if save is enabled
  const canSave = currentTranscript.trim() && !isRecording && !isSaving && !isProcessing;

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
            disabled={isRecording || isSaving}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Mode Selection - Show if no mode selected */}
        {!mode && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">Choose transcription mode:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => selectMode('webspeech')}
                disabled={!isWebSpeechSupported}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isWebSpeechSupported
                    ? 'border-stone-200 hover:border-amber-500 hover:bg-amber-50'
                    : 'border-stone-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="font-medium text-stone-900">Real-time Mode</span>
                </div>
                <p className="text-xs text-stone-600">
                  Fast, real-time transcription. Works in Chrome, Edge, Opera.
                </p>
                {!isWebSpeechSupported && (
                  <p className="text-xs text-rose-600 mt-2">Not available in this browser</p>
                )}
              </button>

              <button
                onClick={() => selectMode('huggingface')}
                disabled={!isHuggingFaceSupported}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isHuggingFaceSupported
                    ? 'border-stone-200 hover:border-amber-500 hover:bg-amber-50'
                    : 'border-stone-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-green-600"
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
                  <span className="font-medium text-stone-900">Private Mode</span>
                </div>
                <p className="text-xs text-stone-600">
                  Uses a lightweight local Moonshine model. First use downloads and caches the
                  model; audio stays on your device.
                </p>
                {isHfLoading && (
                  <p className="text-xs text-amber-600 mt-2">
                    Downloading/loading local AI model...
                  </p>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Browser Support Warning */}
        {mode === 'webspeech' && !isWebSpeechSupported && (
          <BrowserSupportWarning onUseFallback={() => selectMode('huggingface')} />
        )}

        {/* Model Loading Progress for Hugging Face */}
        {mode === 'huggingface' && isHfLoading && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 mb-2">
              Downloading/loading lightweight local AI model (one-time)...
            </p>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${hfProgress}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-1">{hfProgress}%</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        {/* Recording Controls - Only show after mode selected */}
        {mode && (
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={!canStartSelectedMode || isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Start recording"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span className="absolute top-0 right-0 flex h-3 w-3 -mt-1 -mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Transcription Progress for Hugging Face */}
        {mode === 'huggingface' && isHfTranscribing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">Transcribing with AI...</span>
              <span className="text-stone-500">{hfProgress}%</span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${hfProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Transcript Display */}
        {(currentTranscript || isRecording) && mode && (
          <div className="space-y-2">
            <label htmlFor="transcript" className="block text-sm font-medium text-stone-600">
              Transcript
              {isRecording && <span className="ml-2 text-xs text-amber-600">● Recording...</span>}
              {isProcessing && <span className="ml-2 text-xs text-blue-600">● Processing...</span>}
            </label>
            <textarea
              id="transcript"
              value={currentTranscript}
              rows={8}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200 resize-y"
              placeholder={isRecording ? 'Speak now...' : 'Transcript will appear here...'}
              readOnly
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
                    {(item.assignee || item.deadline || item.priority || item.provenance) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
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
                        {item.provenance && (
                          <span className="px-2 py-0.5 bg-stone-200 text-stone-600 rounded-full">
                            Source: {item.provenance.source.segmentId} ·{' '}
                            {Math.round(item.provenance.confidence * 100)}% ·{' '}
                            {item.provenance.confirmationStatus}
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
