import { getVoiceSettings, saveVoiceSettings } from '../voiceSettings';

describe('voiceSettings', () => {
  let getItemSpy: jest.Mock;
  let setItemSpy: jest.Mock;

  beforeEach(() => {
    getItemSpy = jest.fn();
    setItemSpy = jest.fn();

    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: {
          getItem: getItemSpy,
          setItem: setItemSpy,
          clear: jest.fn(),
          removeItem: jest.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    jest.clearAllMocks();
  });

  describe('getVoiceSettings', () => {
    it('returns default settings when none saved', () => {
      getItemSpy.mockReturnValue(null);

      const settings = getVoiceSettings();
      expect(settings).toEqual({
        enabled: false,
        language: 'en-US',
        autoPunctuation: false,
        showCommands: true,
      });
    });

    it('returns saved settings when present', () => {
      const savedSettings = {
        enabled: true,
        language: 'en-GB',
        autoPunctuation: true,
        showCommands: false,
      };
      getItemSpy.mockReturnValue(JSON.stringify(savedSettings));

      const settings = getVoiceSettings();
      expect(settings).toEqual(savedSettings);
    });

    it('parses JSON correctly', () => {
      const savedSettings = {
        enabled: false,
        language: 'fr-FR',
        autoPunctuation: false,
        showCommands: true,
      };
      getItemSpy.mockReturnValue(JSON.stringify(savedSettings));

      const settings = getVoiceSettings();
      expect(settings).toEqual(savedSettings);
    });
  });

  describe('saveVoiceSettings', () => {
    it('saves settings to localStorage', () => {
      const settings = {
        enabled: true,
        language: 'en-US',
        autoPunctuation: false,
        showCommands: true,
      };

      saveVoiceSettings(settings);

      expect(setItemSpy).toHaveBeenCalledWith('voiceSettings', JSON.stringify(settings));
    });

    it('overwrites existing settings', () => {
      getItemSpy.mockReturnValue(undefined);

      const newSettings = {
        enabled: true,
        language: 'en-GB',
        autoPunctuation: true,
        showCommands: false,
      };

      saveVoiceSettings(newSettings);

      expect(setItemSpy).toHaveBeenCalledWith('voiceSettings', JSON.stringify(newSettings));
    });
  });
});
