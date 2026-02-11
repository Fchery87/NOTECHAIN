export const VOICE_SETTINGS_KEY = 'voiceSettings';

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  autoPunctuation: boolean;
  showCommands: boolean;
}

export const defaultVoiceSettings: VoiceSettings = {
  enabled: false,
  language: 'en-US',
  autoPunctuation: false,
  showCommands: true,
};

export function getVoiceSettings(): VoiceSettings {
  if (typeof globalThis.window === 'undefined') {
    return defaultVoiceSettings;
  }

  try {
    const stored = globalThis.window.localStorage.getItem(VOICE_SETTINGS_KEY);
    if (!stored) {
      return defaultVoiceSettings;
    }

    return JSON.parse(stored);
  } catch {
    return defaultVoiceSettings;
  }
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  if (typeof globalThis.window === 'undefined') {
    return;
  }

  try {
    globalThis.window.localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
