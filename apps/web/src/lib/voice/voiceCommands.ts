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
  level?: number;
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
  for (const { pattern, type } of COMMAND_PATTERNS) {
    const match = transcript.match(pattern);
    if (match) {
      return {
        type,
        raw: transcript.trim(),
      };
    }
  }
  return null;
}

export function executeVoiceCommand(command: VoiceCommand, editor: any): void {
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
  }
}
