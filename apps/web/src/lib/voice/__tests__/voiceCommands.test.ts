import { interpretVoiceCommand } from '../voiceCommands';

describe('interpretVoiceCommand', () => {
  describe('Regular text returns null', () => {
    it('returns null for regular text without commands', () => {
      expect(interpretVoiceCommand('hello world')).toBeNull();
    });

    it('returns null for incomplete commands', () => {
      expect(interpretVoiceCommand('bold')).toBeNull();
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
