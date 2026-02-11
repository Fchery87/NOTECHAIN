import { interpretVoiceCommand, executeVoiceCommand, VoiceCommand } from '../voiceCommands';
import type { Editor } from '@tiptap/react';

describe('interpretVoiceCommand', () => {
  describe('Regular text returns null', () => {
    it('returns null for regular text without commands', () => {
      expect(interpretVoiceCommand('hello world')).toBeNull();
    });

    it('returns null for incomplete commands', () => {
      expect(interpretVoiceCommand('bold')).toBeNull();
    });
  });

  describe('Edge case inputs', () => {
    it('returns null for empty string', () => {
      expect(interpretVoiceCommand('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(interpretVoiceCommand('   ')).toBeNull();
      expect(interpretVoiceCommand('\t\n\r')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(interpretVoiceCommand(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(interpretVoiceCommand(undefined as unknown as string)).toBeNull();
    });

    it('returns null for non-string types', () => {
      expect(interpretVoiceCommand(123 as unknown as string)).toBeNull();
      expect(interpretVoiceCommand({} as unknown as string)).toBeNull();
      expect(interpretVoiceCommand([] as unknown as string)).toBeNull();
    });

    it('trims whitespace before matching', () => {
      const result = interpretVoiceCommand('  new paragraph  ');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('NEW_PARAGRAPH');
      expect(result?.raw).toBe('new paragraph');
    });
  });

  describe('NEW_PARAGRAPH command', () => {
    it('recognizes "new paragraph" command', () => {
      const result = interpretVoiceCommand('new paragraph');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('NEW_PARAGRAPH');
    });

    it('is case insensitive', () => {
      expect(interpretVoiceCommand('New Paragraph')).not.toBeNull();
      expect(interpretVoiceCommand('NEW PARAGRAPH')).not.toBeNull();
      expect(interpretVoiceCommand('new paragraph')).not.toBeNull();
    });

    it('handles punctuation after command', () => {
      expect(interpretVoiceCommand('new paragraph.')).not.toBeNull();
      expect(interpretVoiceCommand('new paragraph!')).not.toBeNull();
    });
  });

  describe('NEW_LINE command', () => {
    it('recognizes "new line" command', () => {
      const result = interpretVoiceCommand('new line');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('NEW_LINE');
    });

    it('is case insensitive', () => {
      expect(interpretVoiceCommand('New Line')).not.toBeNull();
      expect(interpretVoiceCommand('NEW LINE')).not.toBeNull();
    });

    it('handles punctuation', () => {
      expect(interpretVoiceCommand('new line.')).not.toBeNull();
    });
  });

  describe('BOLD command', () => {
    it('recognizes "bold that" command', () => {
      const result = interpretVoiceCommand('bold that');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('BOLD');
    });

    it('is case insensitive', () => {
      expect(interpretVoiceCommand('Bold That')).not.toBeNull();
      expect(interpretVoiceCommand('BOLD THAT')).not.toBeNull();
    });

    it('handles punctuation', () => {
      expect(interpretVoiceCommand('bold that.')).not.toBeNull();
      expect(interpretVoiceCommand('bold that!')).not.toBeNull();
    });
  });

  describe('ITALIC command', () => {
    it('recognizes "italicize that" command', () => {
      const result = interpretVoiceCommand('italicize that');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('ITALIC');
    });

    it('is case insensitive', () => {
      expect(interpretVoiceCommand('Italicize That')).not.toBeNull();
      expect(interpretVoiceCommand('ITALICIZE THAT')).not.toBeNull();
    });

    it('handles punctuation', () => {
      expect(interpretVoiceCommand('italicize that.')).not.toBeNull();
    });
  });

  describe('UNDERLINE command', () => {
    it('recognizes "underline that" command', () => {
      const result = interpretVoiceCommand('underline that');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('UNDERLINE');
    });

    it('is case insensitive', () => {
      expect(interpretVoiceCommand('Underline That')).not.toBeNull();
      expect(interpretVoiceCommand('UNDERLINE THAT')).not.toBeNull();
    });

    it('handles punctuation', () => {
      expect(interpretVoiceCommand('underline that.')).not.toBeNull();
    });
  });

  describe('HEADING command', () => {
    it('recognizes "heading" command', () => {
      const result = interpretVoiceCommand('heading');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('HEADING');
    });

    it('recognizes "create heading" command', () => {
      const result = interpretVoiceCommand('create heading');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('HEADING');
    });

    it('is case insensitive', () => {
      expect(interpretVoiceCommand('Heading')).not.toBeNull();
      expect(interpretVoiceCommand('CREATE HEADING')).not.toBeNull();
    });

    it('handles punctuation', () => {
      expect(interpretVoiceCommand('heading.')).not.toBeNull();
      expect(interpretVoiceCommand('create heading!')).not.toBeNull();
    });
  });

  describe('UNDO command', () => {
    it('recognizes "undo that" command', () => {
      const result = interpretVoiceCommand('undo that');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('UNDO');
    });

    it('is case insensitive', () => {
      expect(interpretVoiceCommand('Undo That')).not.toBeNull();
      expect(interpretVoiceCommand('UNDO THAT')).not.toBeNull();
    });

    it('handles punctuation', () => {
      expect(interpretVoiceCommand('undo that.')).not.toBeNull();
    });
  });

  describe('REDO command', () => {
    it('recognizes "redo that" command', () => {
      const result = interpretVoiceCommand('redo that');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('REDO');
    });

    it('is case insensitive', () => {
      expect(interpretVoiceCommand('Redo That')).not.toBeNull();
      expect(interpretVoiceCommand('REDO THAT')).not.toBeNull();
    });

    it('handles punctuation', () => {
      expect(interpretVoiceCommand('redo that.')).not.toBeNull();
    });
  });
});

describe('executeVoiceCommand', () => {
  let mockEditor: jest.Mocked<Editor>;
  let mockChain: any;

  beforeEach(() => {
    mockChain = {
      focus: jest.fn().mockReturnThis(),
      setParagraph: jest.fn().mockReturnThis(),
      toggleBold: jest.fn().mockReturnThis(),
      toggleItalic: jest.fn().mockReturnThis(),
      toggleUnderline: jest.fn().mockReturnThis(),
      setHeading: jest.fn().mockReturnThis(),
      undo: jest.fn().mockReturnThis(),
      redo: jest.fn().mockReturnThis(),
      run: jest.fn(),
    };

    mockEditor = {
      chain: jest.fn().mockReturnValue(mockChain),
    } as unknown as jest.Mocked<Editor>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('NEW_PARAGRAPH command', () => {
    it('calls editor.chain().focus().setParagraph().run()', () => {
      const command: VoiceCommand = { type: 'NEW_PARAGRAPH', raw: 'new paragraph' };
      executeVoiceCommand(command, mockEditor);

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChain.focus).toHaveBeenCalled();
      expect(mockChain.setParagraph).toHaveBeenCalled();
      expect(mockChain.run).toHaveBeenCalled();
    });
  });

  describe('NEW_LINE command', () => {
    it('calls editor.chain().focus().setParagraph().run()', () => {
      const command: VoiceCommand = { type: 'NEW_LINE', raw: 'new line' };
      executeVoiceCommand(command, mockEditor);

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChain.focus).toHaveBeenCalled();
      expect(mockChain.setParagraph).toHaveBeenCalled();
      expect(mockChain.run).toHaveBeenCalled();
    });
  });

  describe('BOLD command', () => {
    it('calls editor.chain().focus().toggleBold().run()', () => {
      const command: VoiceCommand = { type: 'BOLD', raw: 'bold that' };
      executeVoiceCommand(command, mockEditor);

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChain.focus).toHaveBeenCalled();
      expect(mockChain.toggleBold).toHaveBeenCalled();
      expect(mockChain.run).toHaveBeenCalled();
    });
  });

  describe('ITALIC command', () => {
    it('calls editor.chain().focus().toggleItalic().run()', () => {
      const command: VoiceCommand = { type: 'ITALIC', raw: 'italicize that' };
      executeVoiceCommand(command, mockEditor);

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChain.focus).toHaveBeenCalled();
      expect(mockChain.toggleItalic).toHaveBeenCalled();
      expect(mockChain.run).toHaveBeenCalled();
    });
  });

  describe('UNDERLINE command', () => {
    it('calls editor.chain().focus().toggleUnderline().run()', () => {
      const command: VoiceCommand = { type: 'UNDERLINE', raw: 'underline that' };
      executeVoiceCommand(command, mockEditor);

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChain.focus).toHaveBeenCalled();
      expect(mockChain.toggleUnderline).toHaveBeenCalled();
      expect(mockChain.run).toHaveBeenCalled();
    });
  });

  describe('HEADING command', () => {
    it('calls editor.chain().focus().setHeading({ level: 2 }).run()', () => {
      const command: VoiceCommand = { type: 'HEADING', raw: 'heading' };
      executeVoiceCommand(command, mockEditor);

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChain.focus).toHaveBeenCalled();
      expect(mockChain.setHeading).toHaveBeenCalledWith({ level: 2 });
      expect(mockChain.run).toHaveBeenCalled();
    });
  });

  describe('UNDO command', () => {
    it('calls editor.chain().focus().undo().run()', () => {
      const command: VoiceCommand = { type: 'UNDO', raw: 'undo that' };
      executeVoiceCommand(command, mockEditor);

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChain.focus).toHaveBeenCalled();
      expect(mockChain.undo).toHaveBeenCalled();
      expect(mockChain.run).toHaveBeenCalled();
    });
  });

  describe('REDO command', () => {
    it('calls editor.chain().focus().redo().run()', () => {
      const command: VoiceCommand = { type: 'REDO', raw: 'redo that' };
      executeVoiceCommand(command, mockEditor);

      expect(mockEditor.chain).toHaveBeenCalled();
      expect(mockChain.focus).toHaveBeenCalled();
      expect(mockChain.redo).toHaveBeenCalled();
      expect(mockChain.run).toHaveBeenCalled();
    });
  });

  describe('Unknown command type', () => {
    it('throws error for unknown command type', () => {
      const command = { type: 'UNKNOWN_COMMAND', raw: 'unknown' } as unknown as VoiceCommand;
      expect(() => executeVoiceCommand(command, mockEditor)).toThrow('Unknown voice command type');
    });
  });
});
