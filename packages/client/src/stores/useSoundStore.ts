import { create } from 'zustand';
import { setMasterVolume } from '../audio/SoundEngine';

const STORAGE_KEY = 'munchkin_sound_settings';

interface SoundSettings {
  volume: number;
  muted: boolean;
  enabled: boolean;
}

interface SoundStore extends SoundSettings {
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setEnabled: (enabled: boolean) => void;
}

function loadSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        volume: typeof parsed.volume === 'number' ? parsed.volume : 0.5,
        muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      };
    }
  } catch {
    // ignore
  }
  return { volume: 0.5, muted: false, enabled: true };
}

function persist(s: SoundSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function applyVolume(s: SoundSettings) {
  const effective = s.enabled && !s.muted ? s.volume : 0;
  setMasterVolume(effective);
}

const initial = loadSettings();

export const useSoundStore = create<SoundStore>((set, get) => {
  // Apply initial volume on creation
  setTimeout(() => applyVolume(initial), 0);

  return {
    ...initial,

    setVolume: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      const next = { ...get(), volume: clamped };
      applyVolume(next);
      persist(next);
      set({ volume: clamped });
    },

    toggleMute: () => {
      const next = { ...get(), muted: !get().muted };
      applyVolume(next);
      persist(next);
      set({ muted: next.muted });
    },

    setEnabled: (enabled) => {
      const next = { ...get(), enabled };
      applyVolume(next);
      persist(next);
      set({ enabled });
    },
  };
});
