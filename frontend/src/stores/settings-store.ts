import { create } from 'zustand';
import api from '@/lib/api';

interface SettingsState {
  appName: string;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  setAppName: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appName: 'AI CS Manager',
  loaded: false,
  loadSettings: async () => {
    try {
      const res = await api.get('/settings?key=app_name');
      const data = res.data;
      if (data?.value?.name) {
        set({ appName: data.value.name, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
  setAppName: (name: string) => set({ appName: name }),
}));
