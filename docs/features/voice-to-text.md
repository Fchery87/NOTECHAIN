# Voice-to-Text Dictation

## Overview

NoteChain now supports voice dictation in the rich text editor, allowing users to speak notes hands-free using the Web Speech API.

## Features

- **Voice Dictation**: Speak naturally and have your words transcribed into the editor
- **Voice Commands**: Control formatting with spoken commands
- **Visual Feedback**: Animated indicators show when voice input is active
- **Browser Support**: Works in Chrome, Edge, Safari, and other modern browsers

## Voice Commands

| Command                      | Action                      |
| ---------------------------- | --------------------------- |
| "new paragraph"              | Insert a new paragraph      |
| "new line"                   | Insert a line break         |
| "bold that"                  | Toggle bold formatting      |
| "italicize that"             | Toggle italic formatting    |
| "underline that"             | Toggle underline formatting |
| "heading" / "create heading" | Toggle heading (H2)         |
| "undo that"                  | Undo last action            |
| "redo that"                  | Redo last action            |

## Usage

1. Open any note in NoteChain
2. Click the microphone icon in the toolbar
3. Start speaking - your words will appear in the editor
4. Use voice commands for formatting
5. Click the microphone again to stop

## Settings

Voice settings are stored in localStorage and include:

- **Language**: Recognition language (default: en-US)
- **Auto-punctuation**: Automatically add punctuation
- **Show commands**: Display available commands while recording

## Browser Support

Voice input requires browser support for the Web Speech API:

- ✅ Chrome/Edge: Full support
- ✅ Safari: Full support (webkit prefix)
- ✅ Firefox: Partial support (may require enabling in about:config)
- ❌ IE11: Not supported

## Privacy

Voice recognition is performed by your browser using the Web Speech API. Audio may be sent to browser vendor's servers (Google for Chrome, Apple for Safari) for transcription. For fully private voice recognition, we plan to add local Whisper integration in a future update.

## Technical Implementation

### Components

- `useVoiceInput` hook: Manages Web Speech API lifecycle
- `VoiceInputButton`: Toolbar button with visual feedback
- `voiceCommands`: Interpreter for voice formatting commands
- `voiceSettings`: LocalStorage-based preference storage

### Integration

The VoiceInputButton is integrated into the NoteEditor toolbar, positioned between the media section (link/image) and the undo/redo buttons.

## Future Enhancements

- Phase 2: Local Whisper model for privacy-first transcription
- Multi-language support with automatic language detection
- Custom voice command training
- Voice profiles for improved accuracy
- Wake-word detection for hands-free activation
