import { AppSettings, Conversation } from '../types';

const CONVERSATIONS_KEY = 'somgpt_ai_conversations_v1';
const SETTINGS_KEY = 'somgpt_ai_settings_v1';
const ACTIVE_CHAT_KEY = 'somgpt_ai_active_chat_id_v1';

export const defaultSettings: AppSettings = {
  theme: 'dark',
  language: 'so',
  autoSearch: false,
  ttsVoice: 'Kore',
  soundEnabled: true,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load conversations:', e);
  }
  return [];
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
}

export function getActiveChatId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY);
  } catch {
    return null;
  }
}

export function setActiveChatId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_CHAT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY);
    }
  } catch {}
}
