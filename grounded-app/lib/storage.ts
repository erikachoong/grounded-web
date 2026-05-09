import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meditation, Folder, Personality, AppSettings } from './types';

const DEFAULT_PERSONALITIES: Personality[] = [
  {
    id: 'p-calm',
    name: 'Calm & professional',
    text: 'Grounded, calm and professional — like a therapist. No spiritual language, no poetry, no metaphors. Clear, direct and reassuring.',
  },
  {
    id: 'p-warm',
    name: 'Warm & spiritual',
    text: 'Gentle, poetic and warm. Use nature imagery, soft metaphors, and a sense of quiet wonder. Soulful but never preachy.',
  },
  {
    id: 'p-minimal',
    name: 'Minimal & focused',
    text: 'Very spare and minimal. Short phrases, long silences, no unnecessary words. Like a Zen teacher — direct, quiet, precise.',
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  voiceId: 'atEhNo1k29EZslpsboHA', // Callum
  voiceSpeed: 0.7,
  voicePause: 2,
  personality: '',
};

async function get<T>(key: string, fallback: T): Promise<T> {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val === null) return fallback;
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

async function set(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getLibrary: () => get<Meditation[]>('grounded:library', []),
  setLibrary: (v: Meditation[]) => set('grounded:library', v),

  getFolders: () => get<Folder[]>('grounded:folders', []),
  setFolders: (v: Folder[]) => set('grounded:folders', v),

  getPersonalities: () => get<Personality[]>('grounded:personalities', DEFAULT_PERSONALITIES),
  setPersonalities: (v: Personality[]) => set('grounded:personalities', v),

  getSettings: () => get<AppSettings>('grounded:settings', DEFAULT_SETTINGS),
  setSettings: (v: AppSettings) => set('grounded:settings', v),

  getTheme: () => get<'light' | 'dark'>('grounded:theme', 'light'),
  setTheme: (v: 'light' | 'dark') => set('grounded:theme', v),

  getHasVisited: () => get<boolean>('grounded:visited', false),
  setHasVisited: () => set('grounded:visited', true),
};
