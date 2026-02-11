import type { Editor } from '@tiptap/react';

export type VoiceCommandType =
  | 'NEW_PARAGRAPH'
  | 'NEW_LINE'
  | 'BOLD'
  | 'ITALIC'
  | 'UNDERLINE'
  | 'HEADING'
  | 'UNDO'
  | 'REDO';

export interface VoiceCommand {
  type: VoiceCommandType;
  raw: string;
}

const COMMAND_PATTERNS = [
  {
    pattern: /^(new\s+paragraph)[.!?]?$/i,
    type: 'NEW_PARAGRAPH' as VoiceCommandType,
  },
  {
    pattern: /^(new\s+line)[.!?]?$/i,
    type: 'NEW_LINE' as VoiceCommandType,
  },
  {
    pattern: /^(bold\s+that)[.!?]?$/i,
    type: 'BOLD' as VoiceCommandType,
  },
  {
    pattern: /^(italicize\s+that)[.!?]?$/i,
    type: 'ITALIC' as VoiceCommandType,
  },
  {
    pattern: /^(underline\s+that)[.!?]?$/i,
    type: 'UNDERLINE' as VoiceCommandType,
  },
  {
    pattern: /^(create\s+heading)[.!?]?$/i,
    type: 'HEADING' as VoiceCommandType,
  },
  {
    pattern: /^heading[.!?]?$/i,
    type: 'HEADING' as VoiceCommandType,
  },
  {
    pattern: /^(undo\s+that)[.!?]?$/i,
    type: 'UNDO' as VoiceCommandType,
  },
  {
    pattern: /^(redo\s+that)[.!?]?$/i,
    type: 'REDO' as VoiceCommandType,
  },
];

export function interpretVoiceCommand(transcript: string): VoiceCommand | null {
  if (typeof transcript !== 'string') {
    return null;
  }

  const trimmedTranscript = transcript.trim();

  if (trimmedTranscript.length === 0) {
    return null;
  }

  for (const { pattern, type } of COMMAND_PATTERNS) {
    const match = trimmedTranscript.match(pattern);
    if (match) {
      return {
        type,
        raw: trimmedTranscript,
      };
    }
  }
  return null;
}

export function executeVoiceCommand(command: VoiceCommand, editor: Editor): void {
  switch (command.type) {
    case 'NEW_PARAGRAPH':
      editor.chain().focus().setParagraph().run();
      break;
    case 'NEW_LINE':
      editor.chain().focus().setParagraph().run();
      break;
    case 'BOLD':
      editor.chain().focus().toggleBold().run();
      break;
    case 'ITALIC':
      editor.chain().focus().toggleItalic().run();
      break;
    case 'UNDERLINE':
      editor.chain().focus().toggleUnderline().run();
      break;
    case 'HEADING':
      editor.chain().focus().setHeading({ level: 2 }).run();
      break;
    case 'UNDO':
      editor.chain().focus().undo().run();
      break;
    case 'REDO':
      editor.chain().focus().redo().run();
      break;
    default: {
      const _exhaustiveCheck: never = command.type;
      throw new Error(`Unknown voice command type: ${_exhaustiveCheck}`);
    }
  }
}
