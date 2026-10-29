import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dashboard, DEFAULT_CUES, SavedCue, withDefaults } from './defaults';

export type Mode = 'rider' | 'director';

const KEYS = {
  mode: 'sawaari.mode',
  riderCode: 'sawaari.riderCode',
  cues: 'sawaari.cues.v2',
  dashboard: 'sawaari.dashboard.v2',
};

async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function set(key: string, value: unknown) {
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Saving is a convenience; the app still works without it.
  }
}

export const store = {
  getMode: () => get<Mode>(KEYS.mode),
  setMode: (m: Mode | null) => set(KEYS.mode, m),
  getRiderCode: () => get<string>(KEYS.riderCode),
  setRiderCode: (c: string) => set(KEYS.riderCode, c),
  getCues: async (): Promise<SavedCue[]> => {
    const saved = await get<SavedCue[]>(KEYS.cues);
    return Array.isArray(saved) ? saved : DEFAULT_CUES;
  },
  setCues: (c: SavedCue[]) => set(KEYS.cues, c),
  getDashboard: async (): Promise<Dashboard> => withDefaults(await get<Dashboard>(KEYS.dashboard)),
  setDashboard: (d: Dashboard) => set(KEYS.dashboard, d),
};
