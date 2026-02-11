'use client';

import React, { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { interpretVoiceCommand, executeVoiceCommand } from '../lib/voice/voiceCommands';

export interface VoiceInputButtonProps {
  editor: Editor | null;
}

export function VoiceInputButton({ editor }: VoiceInputButtonProps) {
  const handleTranscript = useCallback(
    (transcript: string) => {
      if (!editor) return;

      const command = interpretVoiceCommand(transcript);
      if (command) {
        executeVoiceCommand(command, editor);
      } else {
        // Insert transcript as text if no command recognized
        editor.chain().focus().insertContent(transcript).run();
      }
    },
    [editor]
  );

  const { isListening, isSupported, startListening, stopListening, error } = useVoiceInput({
    onTranscript: handleTranscript,
    continuous: false,
    interimResults: true,
  });

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={!isSupported}
        title={isSupported ? 'Voice input' : 'Voice input not supported'}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        aria-pressed={isListening}
        className={`
          p-2 rounded-lg transition-all duration-200 relative
          ${
            isListening
              ? 'bg-amber-100 text-amber-600'
              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {/* Microphone Icon */}
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

        {/* Animated pulse indicator when listening */}
        {isListening && (
          <span className="absolute top-0 right-0 flex h-2 w-2 -mt-0.5 -mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
      </button>

      {/* Error display */}
      {error && <span className="text-xs text-rose-500">{error.message}</span>}
    </div>
  );
}

export default VoiceInputButton;
